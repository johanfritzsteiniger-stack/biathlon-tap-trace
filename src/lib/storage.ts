import { Session, Athlete } from "@/types/biathlon";

const STORAGE_KEY = "biathlon_sessions";
const ATHLETES_KEY = "biathlon_athletes";

export const storage = {
  // Sessions
  getSessions: (): Session[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSession: (session: Session) => {
    try {
      const sessions = storage.getSessions();
      const index = sessions.findIndex((s) => s.id === session.id);
      if (index >= 0) {
        sessions[index] = session;
      } else {
        sessions.push(session);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  },

  deleteSession: (id: string) => {
    try {
      const sessions = storage.getSessions().filter((s) => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  },

  // Saved athlete names
  getAthleteNames: (): string[] => {
    try {
      const data = localStorage.getItem(ATHLETES_KEY);
      return data ? JSON.parse(data) : ["Max Mustermann", "Anna Schmidt", "Lars König"];
    } catch {
      return ["Max Mustermann", "Anna Schmidt", "Lars König"];
    }
  },

  saveAthleteName: (name: string) => {
    try {
      const names = storage.getAthleteNames();
      if (!names.includes(name)) {
        names.push(name);
        localStorage.setItem(ATHLETES_KEY, JSON.stringify(names));
      }
    } catch (error) {
      console.error("Failed to save athlete name:", error);
    }
  },

  removeAthleteName: (name: string) => {
    try {
      const names = storage.getAthleteNames().filter((n) => n !== name);
      localStorage.setItem(ATHLETES_KEY, JSON.stringify(names));
    } catch (error) {
      console.error("Failed to remove athlete name:", error);
    }
  },
};
