import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Session, AthleteMaster, AppState } from '@/types/biathlon';

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
const DB_VERSION = 2;

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
            { id: crypto.randomUUID(), name: 'Max Mustermann', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: crypto.randomUUID(), name: 'Anna Schmidt', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: crypto.randomUUID(), name: 'Lars König', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ],
          sessions: [],
          version: 2,
        };
        await database.put('appState', defaultState, 'state');
        return defaultState;
      }
      
      return state;
    } catch (error) {
      console.error('Failed to get app state:', error);
      return {
        roster: [],
        sessions: [],
        version: 2,
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
};
