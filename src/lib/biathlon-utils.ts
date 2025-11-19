import { SessionAthlete, ShotEntry, Session, AthleteMaster, ErrorCount } from "@/types/biathlon";

export const createAthleteMaster = (name: string): AthleteMaster => {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const createSessionAthlete = (athleteId: string, nameSnapshot: string): SessionAthlete => {
  return {
    athleteId,
    nameSnapshot,
    entries: [],
    totals: {
      errors: 0,
      count: 0,
      avgErrors: 0,
    },
  };
};

export const calculateTotals = (entries: ShotEntry[]): SessionAthlete["totals"] => {
  const errors = entries.reduce((sum, entry) => sum + entry.errors, 0);
  const count = entries.length;
  const avgErrors = count > 0 ? errors / count : 0;
  return { errors, count, avgErrors };
};

export const addEntry = (athlete: SessionAthlete, errors: ErrorCount, position: 'prone' | 'standing' | 'unknown' = 'unknown'): SessionAthlete => {
  const newEntry: ShotEntry = {
    id: crypto.randomUUID(),
    index: athlete.entries.length + 1,
    errors,
    position,
    timestampISO: new Date().toISOString(),
  };
  
  const updatedEntries = [...athlete.entries, newEntry];
  
  return {
    ...athlete,
    entries: updatedEntries,
    totals: calculateTotals(updatedEntries),
  };
};

export const removeLastEntry = (athlete: SessionAthlete): SessionAthlete => {
  if (athlete.entries.length === 0) return athlete;
  
  const updatedEntries = athlete.entries.slice(0, -1);
  
  return {
    ...athlete,
    entries: updatedEntries,
    totals: calculateTotals(updatedEntries),
  };
};

export const removeEntry = (athlete: SessionAthlete, entryId: string): SessionAthlete => {
  const updatedEntries = athlete.entries.filter(e => e.id !== entryId);
  
  return {
    ...athlete,
    entries: updatedEntries,
    totals: calculateTotals(updatedEntries),
  };
};

export const updateEntry = (
  athlete: SessionAthlete, 
  entryId: string, 
  errors: ErrorCount, 
  position?: 'prone' | 'standing' | 'unknown'
): SessionAthlete => {
  const updatedEntries = athlete.entries.map(e => 
    e.id === entryId 
      ? { ...e, errors, position: position ?? e.position, editedAt: new Date().toISOString() }
      : e
  );
  
  return {
    ...athlete,
    entries: updatedEntries,
    totals: calculateTotals(updatedEntries),
  };
};

export const calculateHitRate = (entries: ShotEntry[]): { totalHits: number; totalShots: number; hitRatePct: number } => {
  const totalShots = entries.length * 5;
  const totalHits = entries.reduce((sum, entry) => sum + (5 - entry.errors), 0);
  const hitRatePct = totalShots > 0 ? (totalHits / totalShots) * 100 : 0;
  
  return { totalHits, totalShots, hitRatePct };
};

export const exportToCSV = (session: Session): string => {
  const headers = [
    "session_name",
    "session_date",
    "athlete",
    "entry_index",
    "position",
    "errors",
    "timestamp",
    "total_errors_to_date",
  ];

  const rows: string[][] = [];
  session.athletes.forEach((athlete) => {
    let errorsSoFar = 0;
    athlete.entries.forEach((entry) => {
      errorsSoFar += entry.errors;
      rows.push([
        session.name,
        session.dateISO.split("T")[0],
        athlete.nameSnapshot,
        entry.index.toString(),
        entry.position,
        entry.errors.toString(),
        entry.timestampISO,
        errorsSoFar.toString(),
      ]);
    });
  });

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  return csv;
};

export const exportSessionSummaryToCSV = (session: Session): string => {
  const headers = [
    "session_name",
    "session_date",
    "athlete",
    "total_entries",
    "total_errors",
    "total_hits",
    "total_shots",
    "hit_rate_pct",
    "prone_entries",
    "prone_errors",
    "prone_hit_rate_pct",
    "standing_entries",
    "standing_errors",
    "standing_hit_rate_pct",
  ];

  const rows: string[][] = session.athletes.map((athlete) => {
    const { totalHits, totalShots, hitRatePct } = calculateHitRate(athlete.entries);
    
    const proneEntries = athlete.entries.filter(e => e.position === 'prone');
    const standingEntries = athlete.entries.filter(e => e.position === 'standing');
    
    const proneStats = calculateHitRate(proneEntries);
    const standingStats = calculateHitRate(standingEntries);
    
    return [
      session.name,
      session.dateISO.split("T")[0],
      athlete.nameSnapshot,
      athlete.totals.count.toString(),
      athlete.totals.errors.toString(),
      totalHits.toString(),
      totalShots.toString(),
      hitRatePct.toFixed(1),
      proneEntries.length.toString(),
      proneEntries.reduce((sum, e) => sum + e.errors, 0).toString(),
      proneStats.hitRatePct.toFixed(1),
      standingEntries.length.toString(),
      standingEntries.reduce((sum, e) => sum + e.errors, 0).toString(),
      standingStats.hitRatePct.toFixed(1),
    ];
  });

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  return csv;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
