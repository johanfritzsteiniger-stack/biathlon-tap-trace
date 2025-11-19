import { AthleteProfile, ProfileSessionSummary } from "@/types/biathlon";

export const calculateProfileTotals = (profile: AthleteProfile | undefined) => {
  if (!profile || profile.summaries.length === 0) {
    return {
      totalShots: 0,
      totalHits: 0,
      hitRatePct: NaN,
      proneShots: 0,
      proneHits: 0,
      proneHitRatePct: NaN,
      standingShots: 0,
      standingHits: 0,
      standingHitRatePct: NaN,
    };
  }

  const totals = profile.summaries.reduce(
    (acc, summary) => ({
      totalShots: acc.totalShots + summary.shotsTotal,
      totalHits: acc.totalHits + summary.hitsTotal,
      proneShots: acc.proneShots + summary.proneShots,
      proneHits: acc.proneHits + summary.proneHits,
      standingShots: acc.standingShots + summary.standingShots,
      standingHits: acc.standingHits + summary.standingHits,
    }),
    { totalShots: 0, totalHits: 0, proneShots: 0, proneHits: 0, standingShots: 0, standingHits: 0 }
  );

  const pct = (hits: number, shots: number) => (shots > 0 ? (hits / shots) * 100 : NaN);

  return {
    ...totals,
    hitRatePct: pct(totals.totalHits, totals.totalShots),
    proneHitRatePct: pct(totals.proneHits, totals.proneShots),
    standingHitRatePct: pct(totals.standingHits, totals.standingShots),
  };
};

export const exportProfileToCSV = (
  profile: AthleteProfile,
  athleteName: string
): string => {
  const headers = [
    "athlete",
    "session_name",
    "session_date",
    "shots_total",
    "hits_total",
    "hit_rate_pct",
    "prone_shots",
    "prone_hits",
    "prone_hit_rate_pct",
    "standing_shots",
    "standing_hits",
    "standing_hit_rate_pct",
  ];

  const rows: string[][] = profile.summaries.map((summary) => [
    athleteName,
    summary.sessionName,
    summary.dateISO.split("T")[0],
    summary.shotsTotal.toString(),
    summary.hitsTotal.toString(),
    isNaN(summary.hitRatePct) ? "—" : summary.hitRatePct.toFixed(1),
    summary.proneShots.toString(),
    summary.proneHits.toString(),
    isNaN(summary.proneHitRatePct) ? "—" : summary.proneHitRatePct.toFixed(1),
    summary.standingShots.toString(),
    summary.standingHits.toString(),
    isNaN(summary.standingHitRatePct) ? "—" : summary.standingHitRatePct.toFixed(1),
  ]);

  const totals = calculateProfileTotals(profile);
  const footerHeaders = [
    "athlete",
    "total_shots",
    "total_hits",
    "hit_rate_pct_total",
    "prone_shots",
    "prone_hits",
    "prone_hit_rate_pct_total",
    "standing_shots",
    "standing_hits",
    "standing_hit_rate_pct_total",
  ];

  const footerRow = [
    athleteName,
    totals.totalShots.toString(),
    totals.totalHits.toString(),
    isNaN(totals.hitRatePct) ? "—" : totals.hitRatePct.toFixed(1),
    totals.proneShots.toString(),
    totals.proneHits.toString(),
    isNaN(totals.proneHitRatePct) ? "—" : totals.proneHitRatePct.toFixed(1),
    totals.standingShots.toString(),
    totals.standingHits.toString(),
    isNaN(totals.standingHitRatePct) ? "—" : totals.standingHitRatePct.toFixed(1),
  ];

  const csv = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
    "",
    footerHeaders.join(","),
    footerRow.join(","),
  ].join("\n");

  return csv;
};
