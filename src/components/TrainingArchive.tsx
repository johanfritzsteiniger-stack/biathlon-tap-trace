import { Session } from "@/types/biathlon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Target, Copy } from "lucide-react";

interface TrainingArchiveProps {
  sessions: Session[];
  onOpenSession: (sessionId: string) => void;
  onDuplicateSession: (sessionId: string) => void;
  onNewTraining: () => void;
}

export const TrainingArchive = ({
  sessions,
  onOpenSession,
  onDuplicateSession,
  onNewTraining,
}: TrainingArchiveProps) => {
  const completedSessions = sessions
    .filter((s) => s.status === "completed")
    .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Trainingsarchiv</h1>
            <Button onClick={onNewTraining}>Neues Training</Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4">
        {completedSessions.length === 0 ? (
          <Card className="p-12 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Noch keine Trainings</h3>
            <p className="text-muted-foreground mb-4">
              Starte dein erstes Training, um die Historie zu sehen.
            </p>
            <Button onClick={onNewTraining}>Training starten</Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {completedSessions.map((session) => {
              const totalErrors = session.athletes.reduce((sum, a) => sum + a.totals.errors, 0);
              const totalEntries = session.athletes.reduce((sum, a) => sum + a.totals.count, 0);

              return (
                <Card
                  key={session.id}
                  className="p-4 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => onOpenSession(session.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{session.name}</h3>
                        <Badge variant="secondary">Abgeschlossen</Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(session.dateISO).toLocaleDateString("de-DE")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {session.athletes.length} Teilnehmer
                        </span>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline">
                          {totalEntries} Einlagen
                        </Badge>
                        <Badge variant="outline">
                          {totalErrors} Fehler
                        </Badge>
                        {totalEntries > 0 && (
                          <Badge variant="outline">
                            Ø {(totalErrors / totalEntries).toFixed(1)} Fehler/Einlage
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateSession(session.id);
                      }}
                      title="Als neues Training duplizieren"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
