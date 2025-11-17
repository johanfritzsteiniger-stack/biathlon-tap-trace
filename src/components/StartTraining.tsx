import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ParticipantSelector } from "./ParticipantSelector";
import { Session, AthleteMaster } from "@/types/biathlon";
import { createSessionAthlete } from "@/lib/biathlon-utils";
import { Calendar } from "lucide-react";

interface StartTrainingProps {
  roster: AthleteMaster[];
  onStartTraining: (session: Session) => void;
  onViewArchive: () => void;
  onAddToRoster: (athlete: AthleteMaster) => void;
}

export const StartTraining = ({
  roster,
  onStartTraining,
  onViewArchive,
  onAddToRoster,
}: StartTrainingProps) => {
  const [trainingName, setTrainingName] = useState("");
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedAthletes, setSelectedAthletes] = useState<AthleteMaster[]>([]);
  const [showSelector, setShowSelector] = useState(false);

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

          <Button
            variant="outline"
            className="w-full"
            onClick={onViewArchive}
          >
            Archiv ansehen
          </Button>
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
    </div>
  );
};
