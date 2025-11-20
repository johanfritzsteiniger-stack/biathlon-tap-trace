import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogOut, TrendingUp, Target, Award } from "lucide-react";
import { db } from "@/lib/db";
import { AthleteProfile, Session } from "@/types/biathlon";
import { formatPct } from "@/lib/profile-utils";

const AthleteDashboard = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [athleteName, setAthleteName] = useState<string>("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'athlete')) {
      navigate('/login');
      return;
    }

    if (user && user.athleteName) {
      loadAthleteData(user.athleteName);
    }
  }, [user, loading, navigate]);

  const loadAthleteData = async (athleteNameFromAuth: string) => {
    setLoadingData(true);
    try {
      const state = await db.getAppState();
      
      // Finde den Athleten in der Roster-Liste
      const athlete = state.roster.find(a => a.name === athleteNameFromAuth);
      
      if (athlete) {
        setAthleteName(athlete.name);
        
        // Lade Profildaten
        const athleteProfile = state.profiles[athlete.id];
        if (athleteProfile) {
          setProfile(athleteProfile);
        }
        
        // Lade alle Sessions des Athleten
        const athleteSessions = state.sessions.filter(s => 
          s.athletes.some(a => a.athleteId === athlete.id)
        );
        setSessions(athleteSessions);
      }
    } catch (error) {
      console.error('Error loading athlete data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Lädt...</div>
      </div>
    );
  }

  if (!user || user.role !== 'athlete') {
    return null;
  }

  // Berechne Statistiken
  const totalSessions = profile?.summaries.length || 0;
  const totalShots = profile?.summaries.reduce((sum, s) => sum + s.shotsTotal, 0) || 0;
  const totalHits = profile?.summaries.reduce((sum, s) => sum + s.hitsTotal, 0) || 0;
  const overallHitRate = totalShots > 0 ? (totalHits / totalShots) * 100 : 0;

  const proneShots = profile?.summaries.reduce((sum, s) => sum + s.proneShots, 0) || 0;
  const proneHits = profile?.summaries.reduce((sum, s) => sum + s.proneHits, 0) || 0;
  const proneHitRate = proneShots > 0 ? (proneHits / proneShots) * 100 : 0;

  const standingShots = profile?.summaries.reduce((sum, s) => sum + s.standingShots, 0) || 0;
  const standingHits = profile?.summaries.reduce((sum, s) => sum + s.standingHits, 0) || 0;
  const standingHitRate = standingShots > 0 ? (standingHits / standingShots) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Athleten Dashboard</h1>
            <p className="text-sm text-muted-foreground">Willkommen, {athleteName}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Abmelden
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trainings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSessions}</div>
              <p className="text-xs text-muted-foreground">Absolvierte Trainings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamttrefferquote</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPct(overallHitRate)}</div>
              <p className="text-xs text-muted-foreground">{totalHits} / {totalShots} Treffer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Liegend</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPct(proneHitRate)}</div>
              <p className="text-xs text-muted-foreground">{proneHits} / {proneShots} Treffer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stehend</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPct(standingHitRate)}</div>
              <p className="text-xs text-muted-foreground">{standingHits} / {standingShots} Treffer</p>
            </CardContent>
          </Card>
        </div>

        {/* Training History */}
        <Card>
          <CardHeader>
            <CardTitle>Trainingshistorie</CardTitle>
            <CardDescription>
              Alle absolvierten Trainingseinheiten
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile && profile.summaries.length > 0 ? (
              <div className="space-y-4">
                {profile.summaries.slice().reverse().map((summary) => (
                  <div key={summary.sessionId}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{summary.sessionName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(summary.dateISO).toLocaleDateString('de-DE', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">{formatPct(summary.hitRatePct)}</p>
                        <p className="text-sm text-muted-foreground">
                          {summary.hitsTotal} / {summary.shotsTotal} Treffer
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Liegend: </span>
                        <span className="font-medium">
                          {formatPct(summary.proneHitRatePct)} ({summary.proneHits}/{summary.proneShots})
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stehend: </span>
                        <span className="font-medium">
                          {formatPct(summary.standingHitRatePct)} ({summary.standingHits}/{summary.standingShots})
                        </span>
                      </div>
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Noch keine Trainingseinheiten absolviert</p>
                <p className="text-sm mt-2">Deine Trainingsdaten werden hier angezeigt, sobald du an einem Training teilnimmst.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Letzte Trainings</CardTitle>
              <CardDescription>
                Die 5 neuesten Trainingseinheiten
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.slice(-5).reverse().map((session) => {
                  const athleteData = session.athletes.find(a => a.nameSnapshot === athleteName);
                  return (
                    <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{session.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.dateISO).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      {athleteData && (
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {athleteData.totals.count - athleteData.totals.errors} / {athleteData.totals.count}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatPct(((athleteData.totals.count - athleteData.totals.errors) / athleteData.totals.count) * 100)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AthleteDashboard;
