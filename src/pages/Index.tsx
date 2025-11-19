import { useState, useEffect } from "react";
import { AthleteList } from "@/components/AthleteList";
import { StartTraining } from "@/components/StartTraining";
import { TrainingEvaluation } from "@/components/TrainingEvaluation";
import { TrainingArchive } from "@/components/TrainingArchive";
import { AthleteProfile } from "@/components/AthleteProfile";
import { Session, AthleteMaster, AthleteProfile as AthleteProfileType } from "@/types/biathlon";
import { createSessionAthlete, exportToCSV, copyToClipboard, downloadCSV } from "@/lib/biathlon-utils";
import { db } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

type View = "start" | "training" | "evaluation" | "archive" | "profile";

const Index = () => {
  const { toast } = useToast();
  const [view, setView] = useState<View>("start");
  const [roster, setRoster] = useState<AthleteMaster[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AthleteProfileType>>({});
  const [viewingAthleteId, setViewingAthleteId] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      const state = await db.getAppState();
      setRoster(state.roster);
      setAllSessions(state.sessions);
      setProfiles(state.profiles);

      if (state.currentSessionId) {
        const session = state.sessions.find(s => s.id === state.currentSessionId);
        if (session && session.status === "active") {
          setCurrentSession(session);
          setView("training");
        }
      }
    };
    loadData();
  }, []);

  const handleAddToRoster = async (athlete: AthleteMaster) => {
    await db.addToRoster(athlete);
    setRoster([...roster, athlete]);
  };

  const handleDeleteFromRoster = async (athleteId: string) => {
    await db.deleteFromRoster(athleteId);
    await db.deleteProfile(athleteId);
    const updatedRoster = await db.getRoster();
    setRoster(updatedRoster);
    setProfiles(prev => {
      const updated = { ...prev };
      delete updated[athleteId];
      return updated;
    });
    toast({ description: "Sportler:in aus Stammliste entfernt" });
  };

  const handleUpdateRoster = async (athlete: AthleteMaster) => {
    await db.updateRosterAthlete(athlete);
    setRoster(roster.map(a => a.id === athlete.id ? athlete : a));
    
    // If profile was enabled, backfill it
    if (athlete.profileEnabled) {
      await db.backfillProfile(athlete.id);
      const profile = await db.getProfile(athlete.id);
      if (profile) {
        setProfiles(prev => ({ ...prev, [athlete.id]: profile }));
      }
    }
    
    toast({ description: athlete.profileEnabled ? "Profil aktiviert" : "Profil deaktiviert" });
  };

  const handleViewProfile = (athleteId: string) => {
    setViewingAthleteId(athleteId);
    setView("profile");
  };

  const handleStartTraining = async (session: Session) => {
    await db.saveSession(session);
    await db.setCurrentSessionId(session.id);
    setCurrentSession(session);
    setAllSessions([...allSessions, session]);
    setView("training");
    toast({ description: `Training "${session.name}" gestartet` });
  };

  const handleUpdateSession = async (session: Session) => {
    await db.saveSession(session);
    setCurrentSession(session);
    setAllSessions(allSessions.map(s => s.id === session.id ? session : s));
    
    // Update profiles for completed sessions
    if (session.status === "completed") {
      await updateProfilesForSession(session);
    }
  };

  const updateProfilesForSession = async (session: Session) => {
    for (const athlete of session.athletes) {
      const athleteMaster = roster.find(a => a.id === athlete.athleteId);
      if (athleteMaster?.profileEnabled) {
        const profile = await db.getProfile(athlete.athleteId);
        const summary = db.createProfileSummary(session, athlete);
        
        const updatedProfile: AthleteProfileType = profile
          ? {
              ...profile,
              summaries: [
                summary,
                ...profile.summaries.filter(s => s.sessionId !== session.id)
              ].sort((a, b) => b.dateISO.localeCompare(a.dateISO)),
              updatedAt: new Date().toISOString(),
            }
          : {
              athleteId: athlete.athleteId,
              summaries: [summary],
              updatedAt: new Date().toISOString(),
            };
        
        await db.updateProfile(athlete.athleteId, updatedProfile);
        setProfiles(prev => ({ ...prev, [athlete.athleteId]: updatedProfile }));
      }
    }
  };

  const handleEndTraining = async () => {
    if (!currentSession) return;

    const completedSession = {
      ...currentSession,
      status: "completed" as const,
      completedAt: new Date().toISOString(),
    };

    await db.saveSession(completedSession);
    await db.setCurrentSessionId(undefined);
    await updateProfilesForSession(completedSession);
    
    setCurrentSession(completedSession);
    setAllSessions(allSessions.map(s => s.id === completedSession.id ? completedSession : s));
    setView("evaluation");
    toast({ description: "Training beendet" });
  };

  const handleExportCSV = () => {
    if (!currentSession) return;
    const csv = exportToCSV(currentSession);
    const filename = `${currentSession.name.replace(/\s+/g, '_')}_${currentSession.dateISO.split("T")[0]}.csv`;
    downloadCSV(csv, filename);
    toast({ description: "CSV exportiert" });
  };

  const handleCopyCSV = async () => {
    if (!currentSession) return;
    const csv = exportToCSV(currentSession);
    const success = await copyToClipboard(csv);
    toast({
      description: success ? "In Zwischenablage kopiert" : "Kopieren fehlgeschlagen",
      variant: success ? "default" : "destructive",
    });
  };

  const handleOpenSession = (sessionId: string) => {
    const session = allSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
      setView("evaluation");
    }
  };

  const handleDuplicateSession = async (sessionId: string) => {
    const session = allSessions.find(s => s.id === sessionId);
    if (!session) return;

    const newSession: Session = {
      id: crypto.randomUUID(),
      name: `${session.name} (Kopie)`,
      dateISO: new Date().toISOString(),
      status: "active",
      athletes: session.athletes.map(a => createSessionAthlete(a.athleteId, a.nameSnapshot)),
      createdAt: new Date().toISOString(),
    };

    await db.saveSession(newSession);
    await db.setCurrentSessionId(newSession.id);
    setCurrentSession(newSession);
    setAllSessions([...allSessions, newSession]);
    setView("training");
    toast({ description: `Training "${newSession.name}" erstellt` });
  };

  const handleDeleteSession = (sessionId: string) => {
    setAllSessions(allSessions.filter(s => s.id !== sessionId));
  };

  const handleNewTraining = () => {
    setCurrentSession(null);
    setView("start");
  };

  if (view === "start") {
    return (
      <StartTraining
        roster={roster}
        onStartTraining={handleStartTraining}
        onViewArchive={() => setView("archive")}
      />
    );
  }

  if (view === "archive") {
    return (
      <TrainingArchive
        sessions={allSessions}
        onOpenSession={handleOpenSession}
        onDuplicateSession={handleDuplicateSession}
        onDeleteSession={handleDeleteSession}
        onNewTraining={handleNewTraining}
      />
    );
  }

  if (view === "profile" && viewingAthleteId) {
    const athlete = roster.find(a => a.id === viewingAthleteId);
    const profile = profiles[viewingAthleteId];
    
    if (!athlete || !profile) {
      return null;
    }
    
    return (
      <AthleteProfile
        athlete={athlete}
        profile={profile}
        onBack={() => setView("start")}
      />
    );
  }

  if (view === "evaluation" && currentSession) {
    return (
      <TrainingEvaluation
        session={currentSession}
        onNewTraining={handleNewTraining}
        onViewArchive={() => setView("archive")}
        onUpdateSession={handleUpdateSession}
        onViewProfile={handleViewProfile}
      />
    );
  }

  if (view === "training" && currentSession) {
    return (
      <AthleteList
        session={currentSession}
        onUpdateSession={handleUpdateSession}
        onEndTraining={handleEndTraining}
        onExport={handleExportCSV}
        onCopy={handleCopyCSV}
      />
    );
  }

  return null;
};

export default Index;
