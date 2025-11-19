import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ParticipantSelector } from "./ParticipantSelector";
import { Session, AthleteMaster } from "@/types/biathlon";
import { createSessionAthlete } from "@/lib/biathlon-utils";
import { Calendar, Archive, ArrowLeft } from "lucide-react";

interface StartTrainingProps {
  roster: AthleteMaster[];
  onStartTraining: (session: Session) => void;
  onViewArchive: () => void;
  onBack?: () => void;
}

export const StartTraining = ({
  roster,
  onStartTraining,
  onViewArchive,
  onBack,
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
      dateISO: trainingDate,
      status: "active",
      athletes: selectedAthletes.map((athlete) => createSessionAthlete(athlete.id, athlete.name)),
      createdAt: new Date().toISOString(),
    };

    onStartTraining(session);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          {onBack && (
            <div className="flex justify-start mb-2">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
          )}
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
                  <Badge key={athlete.id} variant="secondary">
                    {athlete.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleStart}
            disabled={!trainingName.trim() || selectedAthletes.length === 0}
            className="w-full"
            size="lg"
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
        />
      )}
    </div>
  );
};
