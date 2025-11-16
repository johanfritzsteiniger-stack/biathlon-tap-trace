import { Athlete, ShootingRound, Shot, Session } from "@/types/biathlon";

const SHOTS_PER_ROUND = 5;

export const createEmptyShots = (errorCount: number): Shot[] => {
  const shots: Shot[] = [];
  // First fill with misses (errors)
  for (let i = 0; i < errorCount && i < SHOTS_PER_ROUND; i++) {
    shots.push({ hit: false });
  }
  // Then fill remaining with hits
  for (let i = errorCount; i < SHOTS_PER_ROUND; i++) {
    shots.push({ hit: true });
  }
  return shots;
};

export const createShootingRounds = (): ShootingRound[] => {
  return Array.from({ length: 10 }, (_, i) => ({
    index: (i + 1) as ShootingRound["index"],
    shots: createEmptyShots(0),
    errors: 0,
  }));
};

export const createAthlete = (name: string): Athlete => {
  const rounds = createShootingRounds();
  return {
    id: crypto.randomUUID(),
    name,
    rounds,
    totals: {
      errors: 0,
      hits: 50, // 10 rounds * 5 shots
    },
  };
};

export const calculateTotals = (rounds: ShootingRound[]): Athlete["totals"] => {
  const errors = rounds.reduce((sum, round) => sum + round.errors, 0);
  const hits = rounds.length * SHOTS_PER_ROUND - errors;
  return { errors, hits };
};

export const updateRoundFromErrors = (round: ShootingRound, errors: number): ShootingRound => {
  const clampedErrors = Math.max(0, Math.min(SHOTS_PER_ROUND, errors));
  return {
    ...round,
    errors: clampedErrors,
    shots: createEmptyShots(clampedErrors),
  };
};

export const updateRoundFromShots = (round: ShootingRound, shots: Shot[]): ShootingRound => {
  const errors = shots.filter((s) => !s.hit).length;
  return {
    ...round,
    errors,
    shots,
  };
};

export const exportToCSV = (session: Session): string => {
  const headers = [
    "date",
    "athlete",
    ...Array.from({ length: 10 }, (_, i) => `shooting_${i + 1}_errors`),
    "total_errors",
    "total_hits",
  ];

  const rows = session.athletes.map((athlete) => {
    const roundErrors = athlete.rounds.map((r) => r.errors);
    return [
      session.dateISO.split("T")[0],
      athlete.name,
      ...roundErrors,
      athlete.totals.errors,
      athlete.totals.hits,
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
