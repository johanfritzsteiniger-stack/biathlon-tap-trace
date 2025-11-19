import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrainingArchive } from "@/components/TrainingArchive";
import { db } from "@/lib/db";
import type { Session, ID } from "@/types/biathlon";

const Archive = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessionsData, athletesData] = await Promise.all([db.getSessions(), db.getRoster()]);
      setSessions(sessionsData);
    } catch (error) {
      console.error("Error loading archive data:", error);
    }
  };

  const handleOpenSession = (sessionId: ID) => {
    navigate(`/training/${sessionId}?view=evaluation`);
  };

  const handleDuplicateSession = async (sessionId: ID) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    try {
      const duplicated: Session = {
        ...session,
        id: crypto.randomUUID(),
        name: `${session.name} (Kopie)`,
        dateISO: new Date().toISOString().split("T")[0],
        status: "active",
        createdAt: new Date().toISOString(),
        completedAt: undefined,
        athletes: session.athletes.map((sa) => ({
          ...sa,
          entries: [],
          totals: { errors: 0, count: 0, avgErrors: 0 },
        })),
      };

      await db.saveSession(duplicated);
      navigate(`/training/${duplicated.id}?view=training`);
    } catch (error) {
      console.error("Error duplicating session:", error);
    }
  };

  const handleDeleteSession = async (sessionId: ID) => {
    try {
      await db.deleteSession(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  return (
    <TrainingArchive
      sessions={sessions}
      onOpenSession={handleOpenSession}
      onDuplicateSession={handleDuplicateSession}
      onDeleteSession={handleDeleteSession}
      onNewTraining={() => navigate("/")}
    />
  );
};

export default Archive;
