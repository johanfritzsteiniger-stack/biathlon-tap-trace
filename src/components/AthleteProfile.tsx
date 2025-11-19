import { useState } from "react";
import { AthleteProfile as AthleteProfileType, AthleteMaster } from "@/types/biathlon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Target, TrendingUp } from "lucide-react";
import { calculateProfileTotals, exportProfileToCSV } from "@/lib/profile-utils";
import { downloadCSV } from "@/lib/biathlon-utils";
import { useToast } from "@/hooks/use-toast";

interface AthleteProfileProps {
  athlete: AthleteMaster;
  profile: AthleteProfileType;
  onBack: () => void;
}

const formatPct = (value: number) => (isNaN(value) ? "—" : `${value.toFixed(1)}%`);

export const AthleteProfile = ({ athlete, profile, onBack }: AthleteProfileProps) => {
  const { toast } = useToast();
  const [sortBy, setSortBy] = useState<"date" | "hitRate">("date");

  const totals = calculateProfileTotals(profile);

  const sortedSummaries = [...profile.summaries].sort((a, b) => {
    if (sortBy === "date") {
      return b.dateISO.localeCompare(a.dateISO);
    }
    return b.hitRatePct - a.hitRatePct;
  });

  const handleExport = () => {
    const csv = exportProfileToCSV(profile, athlete.name);
    const filename = `Profil_${athlete.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
    downloadCSV(csv, filename);
    toast({ description: "Profil-CSV exportiert" });
  };

  const last5Summaries = profile.summaries.slice(0, 5);
  const avg5 = last5Summaries.length > 0
    ? last5Summaries.reduce((sum, s) => sum + s.hitRatePct, 0) / last5Summaries.length
    : NaN;
  
  const bestSession = profile.summaries.length > 0
    ? profile.summaries.reduce((best, s) => s.hitRatePct > best.hitRatePct ? s : best)
    : null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            CSV Export
          </Button>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Profil: {athlete.name}</h1>
          <p className="text-muted-foreground">
            {profile.summaries.length} Training{profile.summaries.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Overall Stats */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Gesamt-Statistiken
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Gesamt</p>
              <p className="text-2xl font-bold">{formatPct(totals.hitRatePct)}</p>
              <p className="text-xs text-muted-foreground">
                {totals.totalHits} / {totals.totalShots} Treffer
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">L</Badge>
                Liegend
              </p>
              <p className="text-2xl font-bold">{formatPct(totals.proneHitRatePct)}</p>
              <p className="text-xs text-muted-foreground">
                {totals.proneHits} / {totals.proneShots} Treffer
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Badge variant="secondary" className="bg-green-500/10 text-green-600">S</Badge>
                Stehend
              </p>
              <p className="text-2xl font-bold">{formatPct(totals.standingHitRatePct)}</p>
              <p className="text-xs text-muted-foreground">
                {totals.standingHits} / {totals.standingShots} Treffer
              </p>
            </div>
          </div>
        </Card>

        {/* Trends */}
        {last5Summaries.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trends
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Ø Letzte 5 Trainings</p>
                <p className="text-xl font-bold">{formatPct(avg5)}</p>
              </div>
              {bestSession && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Bestes Training</p>
                  <p className="text-xl font-bold">{formatPct(bestSession.hitRatePct)}</p>
                  <p className="text-xs text-muted-foreground">{bestSession.sessionName}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Sort Controls */}
        <div className="flex gap-2">
          <Button
            variant={sortBy === "date" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("date")}
          >
            Nach Datum
          </Button>
          <Button
            variant={sortBy === "hitRate" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("hitRate")}
          >
            Nach Trefferquote
          </Button>
        </div>

        {/* Training List */}
        <div className="space-y-3">
          {sortedSummaries.map((summary) => (
            <Card key={summary.sessionId} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold">{summary.sessionName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(summary.dateISO).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Gesamt</p>
                    <p className="font-bold">{formatPct(summary.hitRatePct)}</p>
                    <p className="text-xs text-muted-foreground">
                      {summary.hitsTotal}/{summary.shotsTotal}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-[10px] px-1">L</Badge>
                    </p>
                    <p className="font-bold">{formatPct(summary.proneHitRatePct)}</p>
                    <p className="text-xs text-muted-foreground">
                      {summary.proneHits}/{summary.proneShots}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-[10px] px-1">S</Badge>
                    </p>
                    <p className="font-bold">{formatPct(summary.standingHitRatePct)}</p>
                    <p className="text-xs text-muted-foreground">
                      {summary.standingHits}/{summary.standingShots}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {profile.summaries.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            Noch keine Trainings mit diesem Profil durchgeführt
          </Card>
        )}
      </div>
    </div>
  );
};
