import { SessionAthlete, ShotEntry, ErrorCount, ShotPosition } from "@/types/biathlon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AthleteEntryEditorProps {
  athlete: SessionAthlete;
  onSave: (updatedEntries: ShotEntry[]) => void;
  onCancel: () => void;
}

export const AthleteEntryEditor = ({ athlete, onSave, onCancel }: AthleteEntryEditorProps) => {
  const [entries, setEntries] = useState<ShotEntry[]>([...athlete.entries]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntryPosition, setNewEntryPosition] = useState<ShotPosition>('prone');
  const [newEntryErrors, setNewEntryErrors] = useState<ErrorCount>(0);

  const handleErrorChange = (entryId: string, errors: ErrorCount) => {
    setEntries(prev => prev.map(e => 
      e.id === entryId 
        ? { ...e, errors, editedAt: new Date().toISOString() }
        : e
    ));
    setHasChanges(true);
  };

  const handlePositionChange = (entryId: string, position: ShotPosition) => {
    setEntries(prev => prev.map(e => 
      e.id === entryId 
        ? { ...e, position, editedAt: new Date().toISOString() }
        : e
    ));
    setHasChanges(true);
  };

  const handleDelete = (entryId: string) => {
    setEntries(prev => prev.filter(e => e.id !== entryId));
    setHasChanges(true);
  };

  const handleAddEntry = () => {
    const newEntry: ShotEntry = {
      id: crypto.randomUUID(),
      index: entries.length + 1,
      errors: newEntryErrors,
      position: newEntryPosition,
      timestampISO: new Date().toISOString(),
    };
    setEntries(prev => [...prev, newEntry]);
    setHasChanges(true);
    setShowAddEntry(false);
    setNewEntryPosition('prone');
    setNewEntryErrors(0);
  };

  const handleSave = () => {
    onSave(entries);
  };

  const getPositionBadge = (position: ShotPosition) => {
    if (position === 'prone') {
      return <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300">Liegend</Badge>;
    }
    if (position === 'standing') {
      return <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300">Stehend</Badge>;
    }
    return <Badge variant="outline">Unbekannt</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {entries.map((entry, idx) => (
          <Card key={entry.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm flex items-center gap-2">
                <span className="font-semibold">#{idx + 1}</span>
                <span className="text-muted-foreground">
                  {new Date(entry.timestampISO).toLocaleTimeString("de-DE", { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                {getPositionBadge(entry.position)}
                {entry.editedAt && (
                  <span className="text-xs text-muted-foreground">(bearbeitet)</span>
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

            <div className="mb-3">
              <Select value={entry.position} onValueChange={(value: ShotPosition) => handlePositionChange(entry.id, value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prone">Liegend</SelectItem>
                  <SelectItem value="standing">Stehend</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Add Entry Section */}
      {!showAddEntry ? (
        <Button onClick={() => setShowAddEntry(true)} variant="outline" className="w-full" size="lg">
          <Plus className="h-4 w-4" />
          Einlage hinzufügen
        </Button>
      ) : (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Neue Einlage</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Position</label>
              <Select value={newEntryPosition} onValueChange={(value: ShotPosition) => setNewEntryPosition(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prone">Liegend</SelectItem>
                  <SelectItem value="standing">Stehend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Fehler</label>
              <div className="flex gap-2">
                {([0, 1, 2, 3, 4, 5] as ErrorCount[]).map((errorCount) => (
                  <Button
                    key={errorCount}
                    onClick={() => setNewEntryErrors(errorCount)}
                    variant={newEntryErrors === errorCount ? "default" : "outline"}
                    className="flex-1 min-h-[56px] text-lg font-semibold"
                  >
                    {errorCount}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleAddEntry} className="flex-1" size="lg">
                Speichern
              </Button>
              <Button onClick={() => setShowAddEntry(false)} variant="outline" className="flex-1" size="lg">
                Abbrechen
              </Button>
            </div>
          </div>
        </Card>
      )}

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
