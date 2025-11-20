import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Search, ArrowLeft, UserPlus, Trash2, Power, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { db } from "@/lib/db";
import type { AthleteMaster, AthleteProfile } from "@/types/biathlon";
import { calculateProfileTotals } from "@/lib/profile-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type AthleteWithProfile = {
  athlete: AthleteMaster;
  profile?: AthleteProfile;
  totalShots?: number;
  totalHits?: number;
  hitRatePct?: number;
};

type LoginCredential = {
  id: string;
  name: string;
  role: string;
  athlete_name: string | null;
  created_at: string;
};

const ProfilesIndex = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<AthleteWithProfile[]>([]);
  const [loginCredentials, setLoginCredentials] = useState<LoginCredential[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAthleteName, setNewAthleteName] = useState("");
  const [newAthleteProfileEnabled, setNewAthleteProfileEnabled] = useState(true);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [showLoginListDialog, setShowLoginListDialog] = useState(false);
  const [showCreateLoginDialog, setShowCreateLoginDialog] = useState(false);
  const [selectedAthleteForLogin, setSelectedAthleteForLogin] = useState<AthleteMaster | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAthletes();
  }, []);

  const loadAthletes = async () => {
    try {
      const allAthletes = await db.getRoster();
      const athletesWithProfiles = await Promise.all(
        allAthletes.map(async (athlete) => {
          const profile = athlete.profileEnabled ? await db.getProfile(athlete.id) : undefined;
          const totals = profile ? calculateProfileTotals(profile) : undefined;
          return {
            athlete,
            profile,
            totalShots: totals?.totalShots,
            totalHits: totals?.totalHits,
            hitRatePct: totals?.hitRatePct,
          };
        })
      );
      setAthletes(athletesWithProfiles);
    } catch (error) {
      console.error("Error loading athletes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLoginCredentials = async () => {
    if (user?.role !== 'admin') return;
    
    try {
      const { data, error } = await supabase
        .from('user_credentials')
        .select('id, name, role, athlete_name, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading credentials:', error);
        toast.error('Fehler beim Laden der Login-Zugänge');
        return;
      }

      setLoginCredentials(data || []);
    } catch (error) {
      console.error('Error loading credentials:', error);
      toast.error('Fehler beim Laden der Login-Zugänge');
    }
  };

  const handleVibrate = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleAthleteClick = (athleteId: string, hasProfile: boolean) => {
    handleVibrate();
    if (hasProfile) {
      navigate(`/profiles/${athleteId}`);
    }
  };

  const handleAddAthlete = async () => {
    if (!newAthleteName.trim()) return;

    handleVibrate();
    try {
      const newAthlete: AthleteMaster = {
        id: crypto.randomUUID(),
        name: newAthleteName.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profileEnabled: newAthleteProfileEnabled,
      };

      await db.addToRoster(newAthlete);
      await loadAthletes();
      setNewAthleteName("");
      setNewAthleteProfileEnabled(true);
      setShowAddDialog(false);
    } catch (error) {
      console.error("Error adding athlete:", error);
    }
  };

  const handleDeleteAthlete = async (athleteId: string) => {
    handleVibrate();
    try {
      await db.deleteFromRoster(athleteId);
      await db.deleteProfile(athleteId);
      await loadAthletes();
    } catch (error) {
      console.error("Error deleting athlete:", error);
    }
  };

  const handleToggleProfile = async (athlete: AthleteMaster) => {
    handleVibrate();
    try {
      const updatedAthlete = {
        ...athlete,
        profileEnabled: !athlete.profileEnabled,
        updatedAt: new Date().toISOString(),
      };
      await db.updateRosterAthlete(updatedAthlete);

      if (!athlete.profileEnabled && updatedAthlete.profileEnabled) {
        await db.backfillProfile(athlete.id);
      }

      await loadAthletes();
    } catch (error) {
      console.error("Error toggling profile:", error);
    }
  };

  const handleOpenCreateLogin = (athlete: AthleteMaster) => {
    handleVibrate();
    setSelectedAthleteForLogin(athlete);
    setLoginUsername(athlete.name.toLowerCase().replace(/\s+/g, ''));
    setLoginPassword("");
    setShowCreateLoginDialog(true);
  };

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleCreateLogin = async () => {
    if (!selectedAthleteForLogin || !loginUsername.trim() || !loginPassword.trim()) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }

    if (user?.role !== 'admin') {
      toast.error("Nur Admins können Login-Zugänge erstellen");
      return;
    }

    handleVibrate();
    try {
      // Get the auth token from localStorage
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        toast.error("Sie müssen angemeldet sein");
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-athlete-login', {
        body: {
          username: loginUsername.trim(),
          password: loginPassword,
          athleteName: selectedAthleteForLogin.name
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // When edge function returns non-2xx status, both error and data are populated
      // Check data first for the actual error message from the function
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      // If there's an error but no data.error, it's a different type of error
      if (error) {
        console.error("Function error:", error);
        toast.error("Fehler beim Erstellen des Login-Zugangs");
        return;
      }

      toast.success(`Login-Zugang für ${selectedAthleteForLogin.name} erstellt`);
      setShowCreateLoginDialog(false);
      setSelectedAthleteForLogin(null);
      setLoginUsername("");
      setLoginPassword("");
      // Reload credentials list
      await loadLoginCredentials();
    } catch (error) {
      console.error("Error creating login:", error);
      toast.error("Fehler beim Erstellen des Login-Zugangs");
    }
  };

  const filteredAndSorted = useMemo(() => {
    const normalized = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return athletes
      .filter((item) => {
        if (!searchQuery) return true;
        const name = item.athlete.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return name.includes(normalized);
      })
      .sort((a, b) => a.athlete.name.localeCompare(b.athlete.name, "de", { sensitivity: "base" }));
  }, [athletes, searchQuery]);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const athletesByLetter = useMemo(() => {
    const map = new Map<string, AthleteWithProfile[]>();
    filteredAndSorted.forEach((item) => {
      const firstLetter = item.athlete.name[0].toUpperCase();
      if (!map.has(firstLetter)) {
        map.set(firstLetter, []);
      }
      map.get(firstLetter)!.push(item);
    });
    return map;
  }, [filteredAndSorted]);

  const scrollToLetter = (letter: string) => {
    handleVibrate();
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const formatPct = (pct?: number) => {
    if (pct === undefined || isNaN(pct)) return "—";
    return `${pct.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Lade Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="border-b border-border px-4 py-4">
          <div className="mx-auto max-w-screen-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    handleVibrate();
                    navigate("/");
                  }}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold text-foreground">Sportlerprofile</h1>
              </div>
              <div className="flex gap-2">
                {user?.role === 'admin' && (
                  <Button
                    className="bg-teal text-teal-foreground hover:bg-teal/90"
                    size="sm"
                    onClick={() => {
                      handleVibrate();
                      loadLoginCredentials();
                      setShowLoginListDialog(true);
                    }}
                    title="Login-Zugänge anzeigen"
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  className="bg-teal text-teal-foreground hover:bg-teal/90"
                  size="sm"
                  onClick={() => {
                    handleVibrate();
                    setShowManageDialog(true);
                  }}
                >
                  Verwalten
                </Button>
                <Button
                  className="bg-teal text-teal-foreground hover:bg-teal/90"
                  size="sm"
                  onClick={() => {
                    handleVibrate();
                    setShowAddDialog(true);
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  Neu
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Sportler:in suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-sm px-4 pb-8 pt-4" ref={listRef}>
        {filteredAndSorted.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery
                ? "Keine Sportler:innen gefunden."
                : "Noch keine Sportler:innen. Legen Sie in der Stammliste Athleten an."}
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {alphabet.map((letter) => {
              const athletesForLetter = athletesByLetter.get(letter);
              if (!athletesForLetter || athletesForLetter.length === 0) return null;

              return (
                <div key={letter} id={`letter-${letter}`} className="space-y-2">
                  <h2 className="sticky top-[140px] z-[5] bg-background py-2 text-lg font-semibold text-muted-foreground">
                    {letter}
                  </h2>
                  <div className="space-y-2">
                    {athletesForLetter.map((item) => (
                      <Card
                        key={item.athlete.id}
                        className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
                        onClick={() => handleAthleteClick(item.athlete.id, !!item.athlete.profileEnabled)}
                      >
                        <div className="flex min-h-[56px] items-center justify-between gap-3 p-4">
                          <div className="flex-1 space-y-1">
                            <p className="font-semibold text-foreground">{item.athlete.name}</p>
                            {item.athlete.profileEnabled && item.profile ? (
                              <p className="text-sm text-muted-foreground">
                                Gesamt: {item.totalShots || 0} Schüsse • {formatPct(item.hitRatePct)}
                              </p>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Kein Profil aktiviert
                              </Badge>
                            )}
                          </div>
                          {item.athlete.profileEnabled && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* A-Z Jumpbar */}
      {filteredAndSorted.length > 10 && (
        <div className="fixed right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-0.5 rounded-full bg-card/80 p-1 shadow-lg backdrop-blur">
          {alphabet.map((letter) => {
            const hasAthletes = athletesByLetter.has(letter);
            return (
              <button
                key={letter}
                onClick={() => hasAthletes && scrollToLetter(letter)}
                disabled={!hasAthletes}
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium transition-colors ${
                  hasAthletes
                    ? "text-accent hover:bg-accent/20 active:bg-accent/30"
                    : "cursor-not-allowed text-muted-foreground/30"
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      )}

      {/* Sportler hinzufügen Dialog */}
      <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sportler:in hinzufügen</AlertDialogTitle>
            <AlertDialogDescription>
              Geben Sie den Namen ein und wählen Sie, ob ein Profil erstellt werden soll.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="athlete-name">Name *</Label>
              <Input
                id="athlete-name"
                placeholder="z.B. Max Mustermann"
                value={newAthleteName}
                onChange={(e) => setNewAthleteName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddAthlete();
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="profile-enabled"
                checked={newAthleteProfileEnabled}
                onCheckedChange={(checked) => setNewAthleteProfileEnabled(checked === true)}
              />
              <Label htmlFor="profile-enabled" className="cursor-pointer">
                Profil für {newAthleteName || "Sportler:in"} anlegen?
              </Label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewAthleteName("")}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddAthlete} disabled={!newAthleteName.trim()}>
              Hinzufügen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stammliste verwalten Dialog */}
      <AlertDialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Stammliste verwalten</AlertDialogTitle>
            <AlertDialogDescription>
              Verwalten Sie Ihre Sportler:innen und deren Profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto py-4">
            {athletes.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Noch keine Sportler:innen angelegt.</p>
            ) : (
              athletes.map((item) => (
                <Card key={item.athlete.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold">{item.athlete.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant={item.athlete.profileEnabled ? "default" : "outline"} className="text-xs">
                          {item.athlete.profileEnabled ? "Profil aktiv" : "Kein Profil"}
                        </Badge>
                        {item.athlete.profileEnabled && item.profile && (
                          <span className="text-xs text-muted-foreground">
                            {item.totalShots || 0} Schüsse • {formatPct(item.hitRatePct)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {user?.role === 'admin' && (
                        <Button
                          className="bg-teal text-teal-foreground hover:bg-teal/90"
                          size="sm"
                          onClick={() => handleOpenCreateLogin(item.athlete)}
                          title="Login erstellen"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        className="bg-teal text-teal-foreground hover:bg-teal/90"
                        size="sm"
                        onClick={() => handleToggleProfile(item.athlete)}
                        title={item.athlete.profileEnabled ? "Profil deaktivieren" : "Profil aktivieren"}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      {item.athlete.profileEnabled && (
                        <Button
                          className="bg-teal text-teal-foreground hover:bg-teal/90"
                          size="sm"
                          onClick={() => {
                            handleVibrate();
                            navigate(`/profiles/${item.athlete.id}`);
                            setShowManageDialog(false);
                          }}
                        >
                          Profil
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="bg-teal text-teal-foreground hover:bg-teal/90" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Sportler:in löschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                              „{item.athlete.name}" dauerhaft aus der Stammliste löschen? Historische Trainings bleiben
                              unangetastet, aber das Profil wird gelöscht.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteAthlete(item.athlete.id)}>
                              Löschen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Schließen</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Login-Zugang erstellen Dialog */}
      <AlertDialog open={showCreateLoginDialog} onOpenChange={setShowCreateLoginDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Login-Zugang erstellen</AlertDialogTitle>
            <AlertDialogDescription>
              Erstellen Sie einen Login-Zugang für {selectedAthleteForLogin?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="login-username">Benutzername</Label>
              <Input
                id="login-username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Benutzername"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Passwort</Label>
              <Input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Passwort"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowCreateLoginDialog(false);
              setSelectedAthleteForLogin(null);
              setLoginUsername("");
              setLoginPassword("");
            }}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCreateLogin}
              disabled={!loginUsername.trim() || !loginPassword.trim()}
            >
              Erstellen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Login-Zugänge Liste Dialog */}
      <AlertDialog open={showLoginListDialog} onOpenChange={setShowLoginListDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Vorhandene Login-Zugänge</AlertDialogTitle>
            <AlertDialogDescription>
              Übersicht aller registrierten Benutzer und deren Zugänge.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[60vh] overflow-y-auto py-4">
            {loginCredentials.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Noch keine Login-Zugänge vorhanden.
              </p>
            ) : (
              <div className="space-y-2">
                {loginCredentials.map((credential) => (
                  <Card key={credential.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{credential.name}</p>
                          <Badge variant={credential.role === 'admin' ? 'default' : 'outline'}>
                            {credential.role === 'admin' ? 'Admin' : 'Athlet'}
                          </Badge>
                        </div>
                        {credential.athlete_name && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Athlet: {credential.athlete_name}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          Erstellt: {new Date(credential.created_at).toLocaleDateString('de-DE', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Schließen</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfilesIndex;
