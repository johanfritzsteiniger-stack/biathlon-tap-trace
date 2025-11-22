import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Users, FolderOpen, LogOut } from "lucide-react";
const Home = () => {
  const navigate = useNavigate();
  const {
    user,
    loading,
    logout
  } = useAuth();
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);
  const handleVibrate = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };
  const handleLogout = () => {
    handleVibrate();
    logout();
    navigate('/login');
  };
  const handleNewTraining = () => {
    handleVibrate();
    navigate("/training");
  };
  const handleProfiles = () => {
    handleVibrate();
    navigate("/profiles");
  };
  const handleArchive = () => {
    handleVibrate();
    navigate("/archive");
  };
  if (loading) {
    return <main className="min-h-screen bg-background p-4 flex items-center justify-center">
        <p className="text-muted-foreground">Lädt...</p>
      </main>;
  }
  if (!user) {
    return null;
  }
  return <main className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-screen-sm space-y-6 pt-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-foreground">Biathlon Training</h1>
          <p className="text-sm text-muted-foreground">Willkommen, {user.name}</p>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="mx-auto gap-2">
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        </div>

        <Card className="space-y-4 p-6 shadow-lg">
          <Button onClick={handleNewTraining} className="h-auto min-h-[72px] w-full flex-col items-start justify-center gap-1 rounded-2xl bg-alt px-6 text-left text-alt-foreground shadow-md transition-all hover:bg-alt/90 hover:shadow-lg active:scale-[0.98]" size="lg">
            <div className="flex w-full items-center justify-between">
              <span className="text-xl font-semibold text-accent">Neues Training</span>
              <Play className="h-10 w-10 opacity-80" />
            </div>
            <span className="text-sm font-normal opacity-70">Trainingsname & Teilnehmer wählen</span>
          </Button>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={handleArchive} className="gap-2 text-sm text-muted-foreground hover:text-foreground bg-accent opacity-95 text-left font-sans">
              <FolderOpen className="h-4 w-4" />
              Archiv
            </Button>
          </div>

          <div className="h-px bg-border" />

          <Button onClick={handleProfiles} className="h-auto min-h-[72px] w-full flex-col items-start justify-center gap-1 rounded-2xl bg-alt px-6 text-left text-alt-foreground shadow-md transition-all hover:bg-alt/90 hover:shadow-lg active:scale-[0.98]" size="lg">
            <div className="flex w-full items-center justify-between">
              <span className="text-xl font-semibold text-accent">Sportlerprofile</span>
              <Users className="h-10 w-10 opacity-80" />
            </div>
            <span className="text-sm font-normal opacity-70">Alle Profile (A–Z)</span>
          </Button>
        </Card>
      </div>
    </main>;
};
export default Home;