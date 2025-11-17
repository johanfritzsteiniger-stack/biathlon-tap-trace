import { Session } from "@/types/biathlon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { exportToCSV, exportSessionSummaryToCSV, copyToClipboard, downloadCSV } from "@/lib/biathlon-utils";
import { useToast } from "@/hooks/use-toast";
import { Download, Copy, BarChart3, Calendar, Users } from "lucide-react";

interface TrainingEvaluationProps {
  session: Session;
  onNewTraining: () => void;
  onViewArchive: () => void;
}

export const TrainingEvaluation = ({
  session,
  onNewTraining,
  onViewArchive,
}: TrainingEvaluationProps) => {
  const { toast } = useToast();

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
  const avgSessionErrors = totalEntries > 0 ? totalErrors / totalEntries : 0;

  const getErrorDistribution = (athleteId: string) => {
    const athlete = session.athletes.find(a => a.athleteId === athleteId);
    if (!athlete) return [];
    
    const dist = [0, 0, 0, 0, 0, 0];
    athlete.entries.forEach(e => dist[e.errors]++);
    return dist;
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
              <div className="text-3xl font-bold">{avgSessionErrors.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Ø Fehler/Einlage</div>
            </div>
          </div>
        </Card>

        {/* Per Athlete */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Sportler:innen</h2>
          {session.athletes.map((athlete) => {
            const distribution = getErrorDistribution(athlete.athleteId);
            return (
              <Card key={athlete.athleteId} className="p-4">
                <h3 className="font-semibold text-lg mb-3">{athlete.nameSnapshot}</h3>
                
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
                    <div className="text-2xl font-bold">{athlete.totals.avgErrors.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Ø Fehler</div>
                  </div>
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
