import { useState, useEffect, useRef } from "react";
import { Athlete, Session } from "@/types/biathlon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorInputModal } from "./ErrorInputModal";
import {
  createAthlete,
  addEntry,
  removeLastEntry,
  exportToCSV,
  downloadCSV,
  copyToClipboard,
} from "@/lib/biathlon-utils";
import { db } from "@/lib/db";
import { Download, Copy, Undo, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const AthleteList = () => {
  const { toast } = useToast();
  const [session, setSession] = useState<Session>(() => ({
    id: crypto.randomUUID(),
    dateISO: new Date().toISOString(),
    athletes: [],
  }));
  const [athleteNames, setAthleteNames] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [lastAction, setLastAction] = useState<{ athleteId: string; action: "add" } | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      const names = await db.getAthleteNames();
      setAthleteNames(names);
      
      const athletes = names.map(createAthlete);
      setSession((prev) => ({ ...prev, athletes }));
    };
    loadData();
  }, []);

  // Auto-save session
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      db.saveSession(session);
    }, 300);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [session]);

  const handleAddName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (athleteNames.includes(trimmed)) {
      toast({ description: "Name existiert bereits", variant: "destructive" });
      return;
    }

    const updatedNames = [...athleteNames, trimmed];
    setAthleteNames(updatedNames);
    await db.saveAthleteNames(updatedNames);

    const newAthlete = createAthlete(trimmed);
    setSession((prev) => ({
      ...prev,
      athletes: [...prev.athletes, newAthlete],
    }));

    setNewName("");
    toast({ description: `${trimmed} hinzugefügt` });
  };

  const handleAthleteClick = (athlete: Athlete) => {
    setSelectedAthlete(athlete);
  };

  const handleSaveEntry = (errors: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (!selectedAthlete) return;

    const updatedAthlete = addEntry(selectedAthlete, errors);
    setSession((prev) => ({
      ...prev,
      athletes: prev.athletes.map((a) =>
        a.id === updatedAthlete.id ? updatedAthlete : a
      ),
    }));

    setLastAction({ athleteId: updatedAthlete.id, action: "add" });

    toast({
      description: `Gespeichert: ${updatedAthlete.name}, Fehler: ${errors} (Einlage #${updatedAthlete.entries.length})`,
      action: (
        <Button size="sm" variant="ghost" onClick={handleUndo}>
          Undo
        </Button>
      ),
    });
  };

  const handleUndo = () => {
    if (!lastAction) return;

    const athlete = session.athletes.find((a) => a.id === lastAction.athleteId);
    if (!athlete) return;

    const updatedAthlete = removeLastEntry(athlete);
    setSession((prev) => ({
      ...prev,
      athletes: prev.athletes.map((a) =>
        a.id === updatedAthlete.id ? updatedAthlete : a
      ),
    }));

    setLastAction(null);
    toast({ description: "Rückgängig gemacht" });
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

  const filteredAthletes = session.athletes.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border shadow-sm p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Sportler:innen</h1>

          {/* Add new athlete */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Neuer Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddName()}
              className="flex-1"
            />
            <Button onClick={handleAddName} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
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
            <Button onClick={handleUndo} variant="ghost" size="icon" disabled={!lastAction}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button onClick={handleCopyCSV} variant="ghost" size="icon">
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={handleExportCSV} variant="ghost" size="icon">
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
              key={athlete.id}
              className="p-4 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleAthleteClick(athlete)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{athlete.name}</h3>
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
              {searchQuery ? "Keine Sportler:innen gefunden" : "Noch keine Sportler:innen"}
            </div>
          )}
        </div>
      </main>

      {/* Error Input Modal */}
      {selectedAthlete && (
        <ErrorInputModal
          open={!!selectedAthlete}
          onClose={() => setSelectedAthlete(null)}
          athleteName={selectedAthlete.name}
          entryNumber={selectedAthlete.entries.length + 1}
          onSave={handleSaveEntry}
        />
      )}
    </div>
  );
};
