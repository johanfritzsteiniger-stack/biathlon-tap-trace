import { useState, useRef } from "react";
import { SessionAthlete, Session, ErrorCount } from "@/types/biathlon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorInputModal } from "./ErrorInputModal";
import {
  addEntry,
  removeLastEntry,
} from "@/lib/biathlon-utils";
import { Download, Copy, Undo, Search, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AthleteListProps {
  session: Session;
  onUpdateSession: (session: Session) => void;
  onEndTraining: () => void;
  onExport: () => void;
  onCopy: () => void;
}

export const AthleteList = ({
  session,
  onUpdateSession,
  onEndTraining,
  onExport,
  onCopy,
}: AthleteListProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState<SessionAthlete | null>(null);
  const [lastAction, setLastAction] = useState<{ athleteId: string; action: "add" } | null>(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const handleAthleteClick = (athlete: SessionAthlete) => {
    if (session.status === "completed") return;
    setSelectedAthlete(athlete);
  };

  const handleSaveEntry = (errors: ErrorCount) => {
    if (!selectedAthlete || session.status === "completed") return;

    const updatedAthlete = addEntry(selectedAthlete, errors);
    const updatedSession = {
      ...session,
      athletes: session.athletes.map((a) =>
        a.athleteId === updatedAthlete.athleteId ? updatedAthlete : a
      ),
    };
    
    onUpdateSession(updatedSession);
    setLastAction({ athleteId: updatedAthlete.athleteId, action: "add" });

    toast({
      description: `Gespeichert: ${updatedAthlete.nameSnapshot}, Fehler: ${errors} (Einlage #${updatedAthlete.entries.length})`,
      action: (
        <Button size="sm" variant="ghost" onClick={handleUndo}>
          Undo
        </Button>
      ),
    });
  };

  const handleUndo = () => {
    if (!lastAction || session.status === "completed") return;

    const athlete = session.athletes.find((a) => a.athleteId === lastAction.athleteId);
    if (!athlete) return;

    const updatedAthlete = removeLastEntry(athlete);
    const updatedSession = {
      ...session,
      athletes: session.athletes.map((a) =>
        a.athleteId === updatedAthlete.athleteId ? updatedAthlete : a
      ),
    };
    
    onUpdateSession(updatedSession);
    setLastAction(null);
    toast({ description: "Rückgängig gemacht" });
  };

  const filteredAthletes = session.athletes.filter((a) =>
    a.nameSnapshot.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border shadow-sm p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{session.name}</h1>
              <p className="text-sm text-muted-foreground">
                {new Date(session.dateISO).toLocaleDateString("de-DE")}
              </p>
            </div>
            {session.status === "active" && (
              <Button onClick={() => setShowEndDialog(true)} variant="destructive" size="sm">
                <LogOut className="h-4 w-4" />
                Training beenden
              </Button>
            )}
          </div>

          {/* Search & Actions */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button 
              onClick={handleUndo} 
              variant="ghost" 
              size="icon" 
              disabled={!lastAction || session.status === "completed"}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button onClick={onCopy} variant="ghost" size="icon">
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={onExport} variant="ghost" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Athlete List */}
      <main className="max-w-4xl mx-auto p-4">
        <div className="grid gap-3">
          {filteredAthletes.map((athlete) => (
            <Card
              key={athlete.athleteId}
              className={`p-4 transition-colors ${
                session.status === "active" ? "cursor-pointer hover:bg-accent" : "opacity-75"
              }`}
              onClick={() => handleAthleteClick(athlete)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{athlete.nameSnapshot}</h3>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary">
                      {athlete.totals.count}× Schießeinlagen
                    </Badge>
                    <Badge variant="outline">
                      Fehler: {athlete.totals.errors}
                    </Badge>
                    {athlete.totals.count > 0 && (
                      <Badge variant="outline">
                        Ø {athlete.totals.avgErrors.toFixed(1)} Fehler/Einlage
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {filteredAthletes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "Keine Sportler:innen gefunden" : "Keine Teilnehmer"}
            </div>
          )}
        </div>
      </main>

      {/* Error Input Modal */}
      {selectedAthlete && session.status === "active" && (
        <ErrorInputModal
          open={!!selectedAthlete}
          onClose={() => setSelectedAthlete(null)}
          athleteName={selectedAthlete.nameSnapshot}
          entryNumber={selectedAthlete.entries.length + 1}
          onSave={handleSaveEntry}
        />
      )}

      {/* End Training Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Training beenden?</AlertDialogTitle>
            <AlertDialogDescription>
              Training "{session.name}" beenden? Danach sind keine weiteren Eingaben möglich.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={onEndTraining}>
              Beenden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
