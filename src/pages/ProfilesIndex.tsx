import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import type { AthleteMaster, AthleteProfile } from "@/types/biathlon";
import { calculateProfileTotals } from "@/lib/profile-utils";

type AthleteWithProfile = {
  athlete: AthleteMaster;
  profile?: AthleteProfile;
  totalShots?: number;
  totalHits?: number;
  hitRatePct?: number;
};

const ProfilesIndex = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<AthleteWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
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
    </div>
  );
};

export default ProfilesIndex;
