import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AthleteMaster } from "@/types/biathlon";
import { createAthleteMaster } from "@/lib/biathlon-utils";
import { Search, Plus } from "lucide-react";

interface ParticipantSelectorProps {
  open: boolean;
  onClose: () => void;
  roster: AthleteMaster[];
  selectedAthletes: AthleteMaster[];
  onSelect: (athletes: AthleteMaster[]) => void;
  onAddToRoster: (athlete: AthleteMaster) => void;
}

export const ParticipantSelector = ({
  open,
  onClose,
  roster,
  selectedAthletes,
  onSelect,
  onAddToRoster,
}: ParticipantSelectorProps) => {
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");

  // Filter out archived athletes by default
  const activeRoster = roster.filter(a => !a.archived);
  
  const filteredRoster = activeRoster.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const isSelected = (athlete: AthleteMaster) =>
    selectedAthletes.some((a) => a.id === athlete.id);

  const toggleAthlete = (athlete: AthleteMaster) => {
    if (isSelected(athlete)) {
      onSelect(selectedAthletes.filter((a) => a.id !== athlete.id));
    } else {
      onSelect([...selectedAthletes, athlete]);
    }
  };

  const handleAddNew = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    
    const exists = roster.find((a) => a.name === trimmed);
    if (exists) {
      if (!isSelected(exists)) {
        toggleAthlete(exists);
      }
      setNewName("");
      return;
    }

    const newAthlete = createAthleteMaster(trimmed);
    onAddToRoster(newAthlete);
    onSelect([...selectedAthletes, newAthlete]);
    setNewName("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Teilnehmer wählen</DialogTitle>
          <DialogDescription>
            Wähle Sportler:innen für dieses Training
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Add new */}
          <div className="flex gap-2">
            <Input
              placeholder="Neuer Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddNew()}
            />
            <Button onClick={handleAddNew} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Roster list */}
          <div className="max-h-80 overflow-y-auto space-y-2">
            {filteredRoster.map((athlete) => (
              <div
                key={athlete.id}
                className="flex items-center gap-3 p-3 rounded-md hover:bg-accent cursor-pointer"
                onClick={() => toggleAthlete(athlete)}
              >
                <Checkbox checked={isSelected(athlete)} />
                <span className="flex-1">{athlete.name}</span>
              </div>
            ))}
            {filteredRoster.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Keine Sportler:innen gefunden
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              {selectedAthletes.length} ausgewählt
            </span>
            <Button onClick={onClose}>Fertig</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
