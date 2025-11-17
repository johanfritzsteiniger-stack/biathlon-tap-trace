import { SessionAthlete, ShotEntry, ErrorCount } from "@/types/biathlon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface AthleteEntryEditorProps {
  athlete: SessionAthlete;
  onSave: (updatedEntries: ShotEntry[]) => void;
  onCancel: () => void;
}

export const AthleteEntryEditor = ({ athlete, onSave, onCancel }: AthleteEntryEditorProps) => {
  const [entries, setEntries] = useState<ShotEntry[]>([...athlete.entries]);
  const [hasChanges, setHasChanges] = useState(false);

  const handleErrorChange = (entryId: string, errors: ErrorCount) => {
    setEntries(prev => prev.map(e => 
      e.id === entryId 
        ? { ...e, errors, editedAt: new Date().toISOString() }
        : e
    ));
    setHasChanges(true);
  };

  const handleDelete = (entryId: string) => {
    setEntries(prev => prev.filter(e => e.id !== entryId));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(entries);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {entries.map((entry, idx) => (
          <Card key={entry.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm">
                <span className="font-semibold">#{idx + 1}</span>
                <span className="text-muted-foreground ml-2">
                  {new Date(entry.timestampISO).toLocaleTimeString("de-DE", { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                {entry.editedAt && (
                  <span className="text-xs text-muted-foreground ml-2">(bearbeitet)</span>
                )}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Einlage löschen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Einlage #{idx + 1} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(entry.id)}>
                      Löschen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            
            <div className="flex gap-2">
              {([0, 1, 2, 3, 4, 5] as ErrorCount[]).map((errorCount) => (
                <Button
                  key={errorCount}
                  onClick={() => handleErrorChange(entry.id, errorCount)}
                  variant={entry.errors === errorCount ? "default" : "outline"}
                  className="flex-1 min-h-[56px] text-lg font-semibold"
                  aria-label={`Fehler ${errorCount}`}
                >
                  {errorCount}
                </Button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-0 bg-background pt-4 pb-2 flex gap-2 border-t">
        <Button onClick={handleSave} className="flex-1" size="lg" disabled={!hasChanges}>
          Änderungen speichern
        </Button>
        <Button onClick={onCancel} variant="outline" className="flex-1" size="lg">
          Abbrechen
        </Button>
      </div>
    </div>
  );
};
