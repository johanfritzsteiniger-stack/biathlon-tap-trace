import { useState, useEffect, useRef } from "react";
import { Athlete, Session, Shot } from "@/types/biathlon";
import { Button } from "@/components/ui/button";
import { ShootingRoundCard } from "./ShootingRoundCard";
import {
  createAthlete,
  calculateTotals,
  updateRoundFromErrors,
  updateRoundFromShots,
  exportToCSV,
  downloadCSV,
  copyToClipboard,
} from "@/lib/biathlon-utils";
import { storage } from "@/lib/storage";
import { ArrowLeft, Undo, Download, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TrainingSessionProps {
  athleteNames: string[];
  onBack: () => void;
}

export const TrainingSession = ({ athleteNames, onBack }: TrainingSessionProps) => {
  const { toast } = useToast();
  const [session, setSession] = useState<Session>(() => ({
    id: crypto.randomUUID(),
    dateISO: new Date().toISOString(),
    athletes: athleteNames.map(createAthlete),
  }));
  const [currentAthleteIndex, setCurrentAthleteIndex] = useState(0);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [history, setHistory] = useState<Session[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentAthlete = session.athletes[currentAthleteIndex];

  // Auto-save to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      storage.saveSession(session);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [session]);

  // Auto-scroll to current round
  useEffect(() => {
    if (scrollRef.current) {
      const cards = scrollRef.current.children;
      const currentCard = cards[currentRoundIndex] as HTMLElement;
      if (currentCard) {
        currentCard.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [currentRoundIndex]);

  const updateAthlete = (updatedAthlete: Athlete) => {
    setHistory([...history, session]);
    setSession((prev) => ({
      ...prev,
      athletes: prev.athletes.map((a) => (a.id === updatedAthlete.id ? updatedAthlete : a)),
    }));
  };

  const handleErrorsChange = (roundIndex: number, errors: number) => {
    const updatedRounds = [...currentAthlete.rounds];
    updatedRounds[roundIndex] = updateRoundFromErrors(updatedRounds[roundIndex], errors);

    const updatedAthlete = {
      ...currentAthlete,
      rounds: updatedRounds,
      totals: calculateTotals(updatedRounds),
    };

    updateAthlete(updatedAthlete);

    // Auto-advance to next round
    if (roundIndex < 9) {
      setTimeout(() => setCurrentRoundIndex(roundIndex + 1), 150);
    }
  };

  const handleShotsChange = (roundIndex: number, shots: Shot[]) => {
    const updatedRounds = [...currentAthlete.rounds];
    updatedRounds[roundIndex] = updateRoundFromShots(updatedRounds[roundIndex], shots);

    const updatedAthlete = {
      ...currentAthlete,
      rounds: updatedRounds,
      totals: calculateTotals(updatedRounds),
    };

    updateAthlete(updatedAthlete);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const previousSession = history[history.length - 1];
      setSession(previousSession);
      setHistory(history.slice(0, -1));
      toast({ description: "Rückgängig gemacht" });
    }
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(session);
    const filename = `biathlon_${session.dateISO.split("T")[0]}.csv`;
    downloadCSV(csv, filename);
    toast({ description: "CSV exportiert" });
  };

  const handleCopyCSV = async () => {
    const csv = exportToCSV(session);
    const success = await copyToClipboard(csv);
    toast({
      description: success ? "In Zwischenablage kopiert" : "Kopieren fehlgeschlagen",
      variant: success ? "default" : "destructive",
    });
  };

  const nextAthlete = () => {
    if (currentAthleteIndex < session.athletes.length - 1) {
      setCurrentAthleteIndex(currentAthleteIndex + 1);
      setCurrentRoundIndex(0);
    }
  };

  const prevAthlete = () => {
    if (currentAthleteIndex > 0) {
      setCurrentAthleteIndex(currentAthleteIndex - 1);
      setCurrentRoundIndex(0);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "5") {
        const errors = parseInt(e.key);
        handleErrorsChange(currentRoundIndex, errors);
      } else if (e.key === "ArrowLeft" && currentRoundIndex > 0) {
        setCurrentRoundIndex(currentRoundIndex - 1);
      } else if (e.key === "ArrowRight" && currentRoundIndex < 9) {
        setCurrentRoundIndex(currentRoundIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentRoundIndex]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Button onClick={onBack} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            <div className="flex gap-2">
              <Button onClick={handleUndo} variant="ghost" size="sm" disabled={history.length === 0}>
                <Undo className="h-4 w-4" />
              </Button>
              <Button onClick={handleCopyCSV} variant="ghost" size="sm">
                <Copy className="h-4 w-4" />
              </Button>
              <Button onClick={handleExportCSV} variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              onClick={prevAthlete}
              variant="ghost"
              size="sm"
              disabled={currentAthleteIndex === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="text-center flex-1">
              <h1 className="text-xl font-bold">{currentAthlete.name}</h1>
              <p className="text-sm text-muted-foreground">
                Fehler gesamt: {currentAthlete.totals.errors} | Treffer: {currentAthlete.totals.hits}
              </p>
            </div>

            <Button
              onClick={nextAthlete}
              variant="ghost"
              size="sm"
              disabled={currentAthleteIndex === session.athletes.length - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Round indicator dots */}
          <div className="flex justify-center gap-1 mt-3">
            {currentAthlete.rounds.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentRoundIndex(idx)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  idx === currentRoundIndex ? "w-6 bg-primary" : "w-2 bg-muted"
                )}
                aria-label={`Zu Schießen ${idx + 1} springen`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Scrollable rounds */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden p-4 flex gap-4"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {currentAthlete.rounds.map((round, idx) => (
          <div key={idx} style={{ scrollSnapAlign: "center" }}>
            <ShootingRoundCard
              round={round}
              onErrorsChange={(errors) => handleErrorsChange(idx, errors)}
              onShotsChange={(shots) => handleShotsChange(idx, shots)}
              autoFocus={idx === currentRoundIndex}
            />
          </div>
        ))}
      </div>

      {/* Athlete navigation */}
      {session.athletes.length > 1 && (
        <div className="p-4 bg-card border-t border-border">
          <p className="text-center text-sm text-muted-foreground mb-2">
            Athlet:in {currentAthleteIndex + 1} von {session.athletes.length}
          </p>
        </div>
      )}
    </div>
  );
};
