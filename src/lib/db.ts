import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Session, Athlete } from '@/types/biathlon';

interface BiathlonDB extends DBSchema {
  sessions: {
    key: string;
    value: Session;
  };
  athletes: {
    key: string;
    value: { names: string[] };
  };
}

const DB_NAME = 'biathlon-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BiathlonDB>> | null = null;

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<BiathlonDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('athletes')) {
          db.createObjectStore('athletes');
        }
      },
    });
  }
  return dbPromise;
};

export const db = {
  // Sessions
  getSessions: async (): Promise<Session[]> => {
    try {
      const database = await getDB();
      return await database.getAll('sessions');
    } catch (error) {
      console.error('Failed to get sessions:', error);
      return [];
    }
  },

  getSession: async (id: string): Promise<Session | undefined> => {
    try {
      const database = await getDB();
      return await database.get('sessions', id);
    } catch (error) {
      console.error('Failed to get session:', error);
      return undefined;
    }
  },

  saveSession: async (session: Session): Promise<void> => {
    try {
      const database = await getDB();
      await database.put('sessions', session);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  },

  deleteSession: async (id: string): Promise<void> => {
    try {
      const database = await getDB();
      await database.delete('sessions', id);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  },

  // Athlete names
  getAthleteNames: async (): Promise<string[]> => {
    try {
      const database = await getDB();
      const data = await database.get('athletes', 'names');
      return data?.names || ['Max Mustermann', 'Anna Schmidt', 'Lars König'];
    } catch (error) {
      console.error('Failed to get athlete names:', error);
      return ['Max Mustermann', 'Anna Schmidt', 'Lars König'];
    }
  },

  saveAthleteNames: async (names: string[]): Promise<void> => {
    try {
      const database = await getDB();
      await database.put('athletes', { names }, 'names');
    } catch (error) {
      console.error('Failed to save athlete names:', error);
    }
  },
};
