import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { StartTraining } from "@/components/StartTraining";
import { TrainingEvaluation } from "@/components/TrainingEvaluation";
import { AthleteProfile } from "@/components/AthleteProfile";
import { AthleteList } from "@/components/AthleteList";
import { db } from "@/lib/db";
import type { AthleteMaster, Session, ID, AthleteProfile as AthleteProfileType } from "@/types/biathlon";
import { exportToCSV } from "@/lib/biathlon-utils";
import { exportProfileToCSV } from "@/lib/profile-utils";

type View = "start" | "training" | "evaluation" | "archive" | "profile";

const Training = () => {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const view = (searchParams.get("view") as View) || "start";

  const [roster, setRoster] = useState<AthleteMaster[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profiles, setProfiles] = useState<Record<ID, AthleteProfileType>>({});
  const [viewingAthleteId, setViewingAthleteId] = useState<ID | null>(null);

  useEffect(() => {
    loadAppData();
  }, []);

  const loadAppData = async () => {
    try {
      const [athletesData, sessionsData] = await Promise.all([db.getRoster(), db.getSessions()]);
      setRoster(athletesData);
      setSessions(sessionsData);

      const profilesMap: Record<ID, AthleteProfileType> = {};
      for (const athlete of athletesData) {
        if (athlete.profileEnabled) {
          const profile = await db.getProfile(athlete.id);
          if (profile) {
            profilesMap[athlete.id] = profile;
          }
        }
      }
      setProfiles(profilesMap);

      const activeSession = sessionsData.find((s) => s.status === "active");
      if (activeSession) {
        setCurrentSession(activeSession);
      }
    } catch (error) {
      console.error("Error loading app data:", error);
    }
  };

  const handleAddToRoster = async (name: string, profileEnabled: boolean = true) => {
    try {
      const newAthlete: AthleteMaster = {
        id: crypto.randomUUID(),
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profileEnabled,
      };
      await db.addToRoster(newAthlete);
      setRoster([...roster, newAthlete]);

      if (profileEnabled) {
        const completedSessions = sessions.filter((s) => s.status === "completed");
        const athleteSessions = completedSessions.filter((s) =>
          s.athletes.some((sa) => sa.athleteId === newAthlete.id)
        );

        if (athleteSessions.length > 0) {
          await db.backfillProfile(newAthlete.id);
          const profile = await db.getProfile(newAthlete.id);
          if (profile) {
            setProfiles({ ...profiles, [newAthlete.id]: profile });
          }
        }
      }
    } catch (error) {
      console.error("Error adding athlete:", error);
    }
  };

  const handleDeleteFromRoster = async (athleteId: ID) => {
    try {
      await db.deleteFromRoster(athleteId);
      setRoster(roster.filter((a) => a.id !== athleteId));

      await db.deleteProfile(athleteId);
      const { [athleteId]: _, ...remainingProfiles } = profiles;
      setProfiles(remainingProfiles);
    } catch (error) {
      console.error("Error deleting athlete:", error);
    }
  };

  const handleUpdateRoster = async (athleteId: ID, updates: Partial<AthleteMaster>) => {
    try {
      const athlete = roster.find((a) => a.id === athleteId);
      if (!athlete) return;

      const wasProfileEnabled = athlete.profileEnabled;
      const isProfileEnabled = updates.profileEnabled ?? wasProfileEnabled;

      const updatedAthlete = { ...athlete, ...updates, updatedAt: new Date().toISOString() };
      await db.updateRosterAthlete(updatedAthlete);
      setRoster(roster.map((a) => (a.id === athleteId ? updatedAthlete : a)));

      if (!wasProfileEnabled && isProfileEnabled) {
        const completedSessions = sessions.filter((s) => s.status === "completed");
        const athleteSessions = completedSessions.filter((s) =>
          s.athletes.some((sa) => sa.athleteId === athleteId)
        );

        if (athleteSessions.length > 0) {
          await db.backfillProfile(athleteId);
          const profile = await db.getProfile(athleteId);
          if (profile) {
            setProfiles({ ...profiles, [athleteId]: profile });
          }
        }
      } else if (wasProfileEnabled && !isProfileEnabled) {
        // Profile disabled - data remains but won't update
      }
    } catch (error) {
      console.error("Error updating athlete:", error);
    }
  };

  const updateProfilesForSession = async (session: Session) => {
    for (const sa of session.athletes) {
      const athlete = roster.find((a) => a.id === sa.athleteId);
      if (!athlete?.profileEnabled) continue;

      const summary = db.createProfileSummary(session, sa);
      let profile = profiles[sa.athleteId];

      if (!profile) {
        profile = {
          athleteId: sa.athleteId,
          summaries: [summary],
          updatedAt: new Date().toISOString(),
        };
      } else {
        const existingIndex = profile.summaries.findIndex((s) => s.sessionId === session.id);
        if (existingIndex >= 0) {
          profile.summaries[existingIndex] = summary;
        } else {
          profile.summaries.push(summary);
        }
        profile.updatedAt = new Date().toISOString();
      }

      await db.updateProfile(sa.athleteId, profile);
      setProfiles({ ...profiles, [sa.athleteId]: profile });
    }
  };

  const handleStartTraining = async (session: Session) => {
    try {
      await db.saveSession(session);
      setCurrentSession(session);
      setSessions([...sessions, session]);
      navigate(`/training/${session.id}?view=training`);
    } catch (error) {
      console.error("Error starting training:", error);
    }
  };

  const handleUpdateSession = async (session: Session) => {
    try {
      await db.saveSession(session);
      setCurrentSession(session);
      setSessions(sessions.map((s) => (s.id === session.id ? session : s)));

      if (session.status === "completed") {
        await updateProfilesForSession(session);
      }
    } catch (error) {
      console.error("Error updating session:", error);
    }
  };

  const handleEndTraining = async () => {
    if (!currentSession) return;

    try {
      const completedSession = {
        ...currentSession,
        status: "completed" as const,
        completedAt: new Date().toISOString(),
      };

      await db.saveSession(completedSession);
      await updateProfilesForSession(completedSession);

      setCurrentSession(null);
      setSessions(sessions.map((s) => (s.id === completedSession.id ? completedSession : s)));
      navigate(`/training/${completedSession.id}?view=evaluation`);
    } catch (error) {
      console.error("Error ending training:", error);
    }
  };

  const handleOpenSession = (sessionId: ID) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
      navigate(`/training/${sessionId}?view=${session.status === "completed" ? "evaluation" : "training"}`);
    }
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
      setCurrentSession(duplicated);
      setSessions([...sessions, duplicated]);
      navigate(`/training/${duplicated.id}?view=training`);
    } catch (error) {
      console.error("Error duplicating session:", error);
    }
  };

  const handleDeleteSession = async (sessionId: ID) => {
    try {
      const session = sessions.find((s) => s.id === sessionId);
      await db.deleteSession(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));

      if (session?.status === "completed") {
        for (const sa of session.athletes) {
          const athlete = roster.find((a) => a.id === sa.athleteId);
          if (!athlete?.profileEnabled) continue;

          const profile = profiles[sa.athleteId];
          if (profile) {
            profile.summaries = profile.summaries.filter((s) => s.sessionId !== sessionId);
            profile.updatedAt = new Date().toISOString();
            await db.updateProfile(sa.athleteId, profile);
            setProfiles({ ...profiles, [sa.athleteId]: profile });
          }
        }
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const handleExportCSV = (sessionId: ID) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const csv = exportToCSV(session);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${session.name}_${session.dateISO}.csv`;
    link.click();
  };

  const handleCopyCSV = (sessionId: ID) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const csv = exportToCSV(session);
    navigator.clipboard.writeText(csv);
  };

  const handleViewProfile = (athleteId: ID) => {
    setViewingAthleteId(athleteId);
    navigate(`/profiles/${athleteId}`);
  };

  const handleNewTraining = () => {
    setCurrentSession(null);
    setViewingAthleteId(null);
    navigate("/training?view=start");
  };

  const renderView = () => {
    if (params.athleteId) {
      const athlete = roster.find((a) => a.id === params.athleteId);
      const profile = athlete ? profiles[athlete.id] : undefined;

      if (!athlete) {
        return (
          <div className="flex min-h-screen items-center justify-center">
            <p>Sportler:in nicht gefunden</p>
          </div>
        );
      }

      return (
        <AthleteProfile
          athlete={athlete}
          profile={profile}
          onBack={() => navigate("/profiles")}
        />
      );
    }

    switch (view) {
      case "start":
        return (
          <StartTraining
            roster={roster}
            onStartTraining={handleStartTraining}
            onViewArchive={() => navigate("/archive")}
            onAddToRoster={(athlete) => handleAddToRoster(athlete.name, athlete.profileEnabled)}
            onDeleteFromRoster={handleDeleteFromRoster}
            onUpdateRoster={(athlete) => handleUpdateRoster(athlete.id, athlete)}
            onViewProfile={handleViewProfile}
            onBack={() => navigate("/")}
          />
        );

      case "training":
        if (!currentSession) {
          navigate("/training?view=start");
          return null;
        }
        return <AthleteList session={currentSession} onUpdateSession={handleUpdateSession} onEndTraining={handleEndTraining} onExport={() => handleExportCSV(currentSession.id)} onCopy={() => handleCopyCSV(currentSession.id)} onBack={() => navigate("/")} />;

      case "evaluation":
        const evalSession = params.sessionId ? sessions.find((s) => s.id === params.sessionId) : currentSession;
        if (!evalSession) {
          navigate("/training?view=start");
          return null;
        }
        return (
          <TrainingEvaluation
            session={evalSession}
            onNewTraining={handleNewTraining}
            onViewArchive={() => navigate("/archive")}
            onUpdateSession={handleUpdateSession}
            onViewProfile={handleViewProfile}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      {renderView()}
      <Toaster />
    </>
  );
};

export default Training;
