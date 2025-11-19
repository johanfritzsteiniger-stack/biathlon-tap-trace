import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ParticipantSelector } from "./ParticipantSelector";
import { Session, AthleteMaster } from "@/types/biathlon";
import { createSessionAthlete } from "@/lib/biathlon-utils";
import { Calendar, Archive, Users, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface StartTrainingProps {
  roster: AthleteMaster[];
  onStartTraining: (session: Session) => void;
  onViewArchive: () => void;
  onAddToRoster: (athlete: AthleteMaster) => void;
  onDeleteFromRoster: (athleteId: string) => void;
}

export const StartTraining = ({
  roster,
  onStartTraining,
  onViewArchive,
  onAddToRoster,
  onDeleteFromRoster,
}: StartTrainingProps) => {
  const [trainingName, setTrainingName] = useState("");
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedAthletes, setSelectedAthletes] = useState<AthleteMaster[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [showRosterManagement, setShowRosterManagement] = useState(false);

  const handleStart = () => {
    if (!trainingName.trim() || selectedAthletes.length === 0) return;

    const session: Session = {
      id: crypto.randomUUID(),
      name: trainingName.trim(),
      dateISO: new Date(trainingDate).toISOString(),
      status: "active",
      athletes: selectedAthletes.map((a) =>
        createSessionAthlete(a.id, a.name)
      ),
      createdAt: new Date().toISOString(),
    };

    onStartTraining(session);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Biathlon Training</h1>
          <p className="text-muted-foreground">Neues Training starten</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="training-name">Trainingsname *</Label>
            <Input
              id="training-name"
              placeholder="z.B. Winter-Intervall"
              value={trainingName}
              onChange={(e) => setTrainingName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="training-date">Datum</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="training-date"
                type="date"
                value={trainingDate}
                onChange={(e) => setTrainingDate(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Teilnehmer ({selectedAthletes.length})</Label>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowSelector(true)}
            >
              Teilnehmer wählen
            </Button>
            {selectedAthletes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedAthletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {athlete.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleStart}
            disabled={!trainingName.trim() || selectedAthletes.length === 0}
          >
            Training starten
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onViewArchive}
            >
              <Archive className="h-4 w-4" />
              Archiv
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowRosterManagement(true)}
            >
              <Users className="h-4 w-4" />
              Stammliste
            </Button>
          </div>
        </div>
      </Card>

      {showSelector && (
        <ParticipantSelector
          open={showSelector}
          onClose={() => setShowSelector(false)}
          roster={roster}
          selectedAthletes={selectedAthletes}
          onSelect={setSelectedAthletes}
          onAddToRoster={onAddToRoster}
        />
      )}

      {/* Roster Management Dialog */}
      <AlertDialog open={showRosterManagement} onOpenChange={setShowRosterManagement}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Stammliste verwalten</AlertDialogTitle>
            <AlertDialogDescription>
              Sportler:innen aus der Stammliste entfernen. Historische Trainings bleiben erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2 py-4">
            {roster.filter(a => !a.archived).map((athlete) => (
              <div key={athlete.id} className="flex items-center justify-between p-3 rounded-md border">
                <span>{athlete.name}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sportler:in löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        „{athlete.name}" dauerhaft aus der Stammliste löschen? Historische Trainings bleiben unangetastet.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteFromRoster(athlete.id)}>
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
            {roster.filter(a => !a.archived).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Keine Sportler:innen in der Stammliste
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <Button onClick={() => setShowRosterManagement(false)} className="w-full">
              Fertig
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
