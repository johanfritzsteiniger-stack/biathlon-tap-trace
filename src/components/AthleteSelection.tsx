import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Plus, ArrowRight } from "lucide-react";
import { storage } from "@/lib/storage";

interface AthleteSelectionProps {
  onStartTraining: (selectedNames: string[]) => void;
}

export const AthleteSelection = ({ onStartTraining }: AthleteSelectionProps) => {
  const [savedNames] = useState(storage.getAthleteNames());
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [newName, setNewName] = useState("");

  const handleToggle = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleAddNew = () => {
    const trimmed = newName.trim();
    if (trimmed && !savedNames.includes(trimmed)) {
      storage.saveAthleteName(trimmed);
      setSelectedNames([...selectedNames, trimmed]);
      setNewName("");
      window.location.reload(); // Reload to refresh saved names
    }
  };

  const handleStart = () => {
    if (selectedNames.length > 0) {
      onStartTraining(selectedNames);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Biathlon Training</h1>
          <p className="text-muted-foreground">Athlet:innen auswählen</p>
        </header>

        <Card className="p-6 mb-6 flex-1">
          <h2 className="text-lg font-semibold mb-4">Gespeicherte Athlet:innen</h2>
          <div className="space-y-3 mb-6">
            {savedNames.map((name) => (
              <label
                key={name}
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer transition-colors active:scale-[0.98]"
                style={{ minHeight: "56px" }}
              >
                <Checkbox
                  checked={selectedNames.includes(name)}
                  onCheckedChange={() => handleToggle(name)}
                  className="h-6 w-6"
                />
                <span className="text-lg font-medium">{name}</span>
              </label>
            ))}
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-semibold mb-3">Neuer Name</h3>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name eingeben"
                className="text-lg h-14"
                onKeyDown={(e) => e.key === "Enter" && handleAddNew()}
              />
              <Button
                onClick={handleAddNew}
                size="lg"
                variant="secondary"
                className="h-14 px-6"
                disabled={!newName.trim()}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>

        <Button
          onClick={handleStart}
          disabled={selectedNames.length === 0}
          size="lg"
          className="w-full h-16 text-xl font-semibold"
        >
          Training starten
          <ArrowRight className="ml-2 h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};
