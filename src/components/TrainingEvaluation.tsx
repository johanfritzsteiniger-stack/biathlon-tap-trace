import { Session, SessionAthlete, ShotEntry, ShotPosition } from "@/types/biathlon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { exportToCSV, exportSessionSummaryToCSV, copyToClipboard, downloadCSV, calculateHitRate, calculateTotals } from "@/lib/biathlon-utils";
import { useToast } from "@/hooks/use-toast";
import { Download, Copy, BarChart3, Calendar, Users, Edit } from "lucide-react";
import { AthleteEntryEditor } from "./AthleteEntryEditor";
import { useState } from "react";

interface TrainingEvaluationProps {
  session: Session;
  onNewTraining: () => void;
  onViewArchive: () => void;
  onUpdateSession: (session: Session) => void;
}

export const TrainingEvaluation = ({
  session,
  onNewTraining,
  onViewArchive,
  onUpdateSession,
}: TrainingEvaluationProps) => {
  const { toast } = useToast();
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);

  const handleExportCSV = () => {
    const csv = exportToCSV(session);
    const filename = `${session.name.replace(/\s+/g, '_')}_${session.dateISO.split("T")[0]}.csv`;
    downloadCSV(csv, filename);
    toast({ description: "CSV exportiert" });
  };

  const handleExportSummary = () => {
    const csv = exportSessionSummaryToCSV(session);
    const filename = `${session.name.replace(/\s+/g, '_')}_Auswertung_${session.dateISO.split("T")[0]}.csv`;
    downloadCSV(csv, filename);
    toast({ description: "Auswertung exportiert" });
  };

  const handleCopyCSV = async () => {
    const csv = exportToCSV(session);
    const success = await copyToClipboard(csv);
    toast({
      description: success ? "In Zwischenablage kopiert" : "Kopieren fehlgeschlagen",
      variant: success ? "default" : "destructive",
    });
  };

  const totalErrors = session.athletes.reduce((sum, a) => sum + a.totals.errors, 0);
  const totalEntries = session.athletes.reduce((sum, a) => sum + a.totals.count, 0);
  const totalShots = totalEntries * 5;
  const totalHits = session.athletes.reduce((sum, a) => {
    const { totalHits } = calculateHitRate(a.entries);
    return sum + totalHits;
  }, 0);
  const sessionHitRatePct = totalShots > 0 ? (totalHits / totalShots) * 100 : 0;

  const handleSaveEntries = (athleteId: string, updatedEntries: ShotEntry[]) => {
    const updatedAthletes = session.athletes.map(a => {
      if (a.athleteId === athleteId) {
        const reindexedEntries = updatedEntries.map((e, idx) => ({ ...e, index: idx + 1 }));
        return {
          ...a,
          entries: reindexedEntries,
          totals: calculateTotals(reindexedEntries),
        };
      }
      return a;
    });

    const updatedSession = {
      ...session,
      athletes: updatedAthletes,
    };

    onUpdateSession(updatedSession);
    setEditingAthleteId(null);
    
    const changedCount = updatedEntries.filter(e => e.editedAt).length;
    toast({ 
      description: `Aktualisiert: ${session.athletes.find(a => a.athleteId === athleteId)?.nameSnapshot} – ${changedCount} Einlagen geändert` 
    });
  };

  const getErrorDistribution = (athleteId: string) => {
    const athlete = session.athletes.find(a => a.athleteId === athleteId);
    if (!athlete) return [];
    
    const dist = [0, 0, 0, 0, 0, 0];
    athlete.entries.forEach(e => dist[e.errors]++);
    return dist;
  };

  const getPositionStats = (entries: ShotEntry[], position: ShotPosition) => {
    const filtered = entries.filter(e => e.position === position);
    const { totalHits, totalShots, hitRatePct } = calculateHitRate(filtered);
    const totalErrors = filtered.reduce((sum, e) => sum + e.errors, 0);
    return {
      count: filtered.length,
      errors: totalErrors,
      hits: totalHits,
      shots: totalShots,
      hitRatePct,
    };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{session.name}</h1>
              <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(session.dateISO).toLocaleDateString("de-DE")}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {session.athletes.length} Teilnehmer
                </span>
              </div>
            </div>
            <Badge variant="secondary">Abgeschlossen</Badge>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <Download className="h-4 w-4" />
              CSV Export
            </Button>
            <Button onClick={handleExportSummary} variant="outline" size="sm">
              <BarChart3 className="h-4 w-4" />
              Auswertung
            </Button>
            <Button onClick={handleCopyCSV} variant="outline" size="sm">
              <Copy className="h-4 w-4" />
              Kopieren
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Session Summary */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Training-Übersicht</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{totalEntries}</div>
              <div className="text-sm text-muted-foreground">Einlagen gesamt</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-destructive">{totalErrors}</div>
              <div className="text-sm text-muted-foreground">Fehler gesamt</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{sessionHitRatePct.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Trefferquote</div>
            </div>
          </div>
        </Card>

        {/* Per Athlete */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Sportler:innen</h2>
          {session.athletes.map((athlete) => {
            const distribution = getErrorDistribution(athlete.athleteId);
            const { totalHits, totalShots, hitRatePct } = calculateHitRate(athlete.entries);
            const proneStats = getPositionStats(athlete.entries, 'prone');
            const standingStats = getPositionStats(athlete.entries, 'standing');
            const isEditing = editingAthleteId === athlete.athleteId;
            
            return (
              <Card key={athlete.athleteId} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{athlete.nameSnapshot}</h3>
                  {!isEditing && (
                    <Button
                      onClick={() => setEditingAthleteId(athlete.athleteId)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="h-4 w-4" />
                      Einlagen bearbeiten
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <AthleteEntryEditor
                    athlete={athlete}
                    onSave={(entries) => handleSaveEntries(athlete.athleteId, entries)}
                    onCancel={() => setEditingAthleteId(null)}
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-2xl font-bold">{athlete.totals.count}</div>
                        <div className="text-xs text-muted-foreground">Einlagen</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-destructive">{athlete.totals.errors}</div>
                        <div className="text-xs text-muted-foreground">Fehler</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">{hitRatePct.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Trefferquote</div>
                      </div>
                    </div>

                    {/* Position-based Statistics */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <Card className="p-3 bg-blue-500/10 border-blue-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300">
                            Liegend
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Einlagen:</span>
                            <span className="font-semibold">{proneStats.count}×</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fehler:</span>
                            <span className="font-semibold">{proneStats.errors}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Trefferquote:</span>
                            <span className="font-semibold text-primary">
                              {proneStats.count > 0 ? `${proneStats.hitRatePct.toFixed(1)}%` : '—'}
                            </span>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-3 bg-green-500/10 border-green-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300">
                            Stehend
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Einlagen:</span>
                            <span className="font-semibold">{standingStats.count}×</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fehler:</span>
                            <span className="font-semibold">{standingStats.errors}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Trefferquote:</span>
                            <span className="font-semibold text-primary">
                              {standingStats.count > 0 ? `${standingStats.hitRatePct.toFixed(1)}%` : '—'}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Fehlerverteilung</div>
                      <div className="space-y-1">
                        {distribution.map((count, errors) => (
                          <div key={errors} className="flex items-center gap-2">
                            <span className="text-xs w-12">{errors} Fehler</span>
                            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{
                                  width: athlete.totals.count > 0 ? `${(count / athlete.totals.count) * 100}%` : '0%',
                                }}
                              />
                            </div>
                            <span className="text-xs w-12 text-right">{count}×</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button onClick={onNewTraining} className="flex-1" size="lg">
            Neues Training starten
          </Button>
          <Button onClick={onViewArchive} variant="outline" className="flex-1" size="lg">
            Zur Trainingsliste
          </Button>
        </div>
      </main>
    </div>
  );
};
