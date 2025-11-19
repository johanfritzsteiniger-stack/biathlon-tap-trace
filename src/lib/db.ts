import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Session, AthleteMaster, AppState, AthleteProfile, ProfileSessionSummary, SessionAthlete } from '@/types/biathlon';

interface BiathlonDB extends DBSchema {
  sessions: {
    key: string;
    value: Session;
  };
  roster: {
    key: string;
    value: AthleteMaster;
  };
  appState: {
    key: string;
    value: AppState;
  };
}

const DB_NAME = 'biathlon-db';
const DB_VERSION = 4;

let dbPromise: Promise<IDBPDatabase<BiathlonDB>> | null = null;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<BiathlonDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('roster')) {
          db.createObjectStore('roster', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('appState')) {
          db.createObjectStore('appState');
        }
        
        // Migration from V1 to V2 - remove old athletes store
        // Data migration happens in getAppState
      },
    });
  }
  return dbPromise;
};

export const db = {
  // AppState
  getAppState: async (): Promise<AppState> => {
    try {
      const database = await getDB();
      const state = await database.get('appState', 'state');
      
      if (!state) {
        // Initialize with default seed data
        const defaultState: AppState = {
          roster: [
            { id: crypto.randomUUID(), name: 'Max Mustermann', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), profileEnabled: true },
            { id: crypto.randomUUID(), name: 'Anna Schmidt', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), profileEnabled: true },
            { id: crypto.randomUUID(), name: 'Lars König', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), profileEnabled: true },
          ],
          sessions: [],
          profiles: {},
          version: 4,
        };
        await database.put('appState', defaultState, 'state');
        return defaultState;
      }
      
      // Migration to version 4
      if (state.version < 4) {
        state.profiles = state.profiles || {};
        state.version = 4;
        await database.put('appState', state, 'state');
      }
      
      return state;
    } catch (error) {
      console.error('Failed to get app state:', error);
      return {
        roster: [],
        sessions: [],
        profiles: {},
        version: 4,
      };
    }
  },

  saveAppState: async (state: AppState): Promise<void> => {
    try {
      const database = await getDB();
      await database.put('appState', state, 'state');
    } catch (error) {
      console.error('Failed to save app state:', error);
    }
  },

  // Roster
  getRoster: async (): Promise<AthleteMaster[]> => {
    try {
      const state = await db.getAppState();
      return state.roster;
    } catch (error) {
      console.error('Failed to get roster:', error);
      return [];
    }
  },

  addToRoster: async (athlete: AthleteMaster): Promise<void> => {
    try {
      const state = await db.getAppState();
      const exists = state.roster.find(a => a.name === athlete.name);
      if (!exists) {
        state.roster.push(athlete);
        await db.saveAppState(state);
      }
    } catch (error) {
      console.error('Failed to add to roster:', error);
    }
  },

  updateRosterAthlete: async (athlete: AthleteMaster): Promise<void> => {
    try {
      const state = await db.getAppState();
      const index = state.roster.findIndex(a => a.id === athlete.id);
      if (index >= 0) {
        state.roster[index] = { ...athlete, updatedAt: new Date().toISOString() };
        await db.saveAppState(state);
      }
    } catch (error) {
      console.error('Failed to update roster athlete:', error);
    }
  },

  deleteFromRoster: async (athleteId: string): Promise<void> => {
    try {
      const state = await db.getAppState();
      state.roster = state.roster.filter(a => a.id !== athleteId);
      await db.saveAppState(state);
    } catch (error) {
      console.error('Failed to delete from roster:', error);
    }
  },

  // Sessions
  getSessions: async (): Promise<Session[]> => {
    try {
      const state = await db.getAppState();
      return state.sessions;
    } catch (error) {
      console.error('Failed to get sessions:', error);
      return [];
    }
  },

  getSession: async (id: string): Promise<Session | undefined> => {
    try {
      const state = await db.getAppState();
      return state.sessions.find(s => s.id === id);
    } catch (error) {
      console.error('Failed to get session:', error);
      return undefined;
    }
  },

  saveSession: async (session: Session): Promise<void> => {
    try {
      const state = await db.getAppState();
      const index = state.sessions.findIndex(s => s.id === session.id);
      if (index >= 0) {
        state.sessions[index] = session;
      } else {
        state.sessions.push(session);
      }
      await db.saveAppState(state);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  },

  deleteSession: async (id: string): Promise<void> => {
    try {
      const state = await db.getAppState();
      state.sessions = state.sessions.filter(s => s.id !== id);
      await db.saveAppState(state);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  },

  getCurrentSession: async (): Promise<Session | undefined> => {
    try {
      const state = await db.getAppState();
      if (state.currentSessionId) {
        return state.sessions.find(s => s.id === state.currentSessionId);
      }
      return undefined;
    } catch (error) {
      console.error('Failed to get current session:', error);
      return undefined;
    }
  },

  setCurrentSessionId: async (sessionId: string | undefined): Promise<void> => {
    try {
      const state = await db.getAppState();
      state.currentSessionId = sessionId;
      await db.saveAppState(state);
    } catch (error) {
      console.error('Failed to set current session:', error);
    }
  },

  // Profiles
  getProfile: async (athleteId: string): Promise<AthleteProfile | undefined> => {
    try {
      const state = await db.getAppState();
      return state.profiles[athleteId];
    } catch (error) {
      console.error('Failed to get profile:', error);
      return undefined;
    }
  },

  updateProfile: async (athleteId: string, profile: AthleteProfile): Promise<void> => {
    try {
      const state = await db.getAppState();
      state.profiles[athleteId] = profile;
      await db.saveAppState(state);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  },

  deleteProfile: async (athleteId: string): Promise<void> => {
    try {
      const state = await db.getAppState();
      delete state.profiles[athleteId];
      await db.saveAppState(state);
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  },

  backfillProfile: async (athleteId: string): Promise<void> => {
    try {
      const state = await db.getAppState();
      const athlete = state.roster.find(a => a.id === athleteId);
      if (!athlete || !athlete.profileEnabled) return;

      const completedSessions = state.sessions.filter(s => s.status === 'completed');
      const summaries: ProfileSessionSummary[] = [];

      for (const session of completedSessions) {
        const sessionAthlete = session.athletes.find(a => a.athleteId === athleteId);
        if (sessionAthlete && sessionAthlete.entries.length > 0) {
          const summary = db.createProfileSummary(session, sessionAthlete);
          summaries.push(summary);
        }
      }

      const profile: AthleteProfile = {
        athleteId,
        summaries: summaries.sort((a, b) => b.dateISO.localeCompare(a.dateISO)),
        updatedAt: new Date().toISOString(),
      };

      state.profiles[athleteId] = profile;
      await db.saveAppState(state);
    } catch (error) {
      console.error('Failed to backfill profile:', error);
    }
  },

  createProfileSummary: (session: Session, sessionAthlete: SessionAthlete): ProfileSessionSummary => {
    const entries = sessionAthlete.entries;
    const totalShots = entries.length * 5;
    const totalHits = entries.reduce((s, e) => s + (5 - e.errors), 0);
    
    const prone = entries.filter(e => e.position === 'prone');
    const standing = entries.filter(e => e.position === 'standing');
    
    const proneShots = prone.length * 5;
    const proneHits = prone.reduce((s, e) => s + (5 - e.errors), 0);
    
    const standingShots = standing.length * 5;
    const standingHits = standing.reduce((s, e) => s + (5 - e.errors), 0);
    
    const pct = (hits: number, shots: number) => shots > 0 ? (hits / shots) * 100 : NaN;
    
    return {
      sessionId: session.id,
      sessionName: session.name,
      dateISO: session.dateISO,
      shotsTotal: totalShots,
      hitsTotal: totalHits,
      hitRatePct: pct(totalHits, totalShots),
      proneShots,
      proneHits,
      proneHitRatePct: pct(proneHits, proneShots),
      standingShots,
      standingHits,
      standingHitRatePct: pct(standingHits, standingShots),
    };
  },
};
