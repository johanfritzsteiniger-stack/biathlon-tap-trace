import { Athlete, ShotEntry, Session } from "@/types/biathlon";

export const createAthlete = (name: string): Athlete => {
  return {
    id: crypto.randomUUID(),
    name,
    entries: [],
    totals: {
      errors: 0,
      count: 0,
      avgErrors: 0,
    },
  };
};

export const calculateTotals = (entries: ShotEntry[]): Athlete["totals"] => {
  const errors = entries.reduce((sum, entry) => sum + entry.errors, 0);
  const count = entries.length;
  const avgErrors = count > 0 ? errors / count : 0;
  return { errors, count, avgErrors };
};

export const addEntry = (athlete: Athlete, errors: 0 | 1 | 2 | 3 | 4 | 5): Athlete => {
  const newEntry: ShotEntry = {
    index: athlete.entries.length + 1,
    errors,
    timestampISO: new Date().toISOString(),
  };
  
  const updatedEntries = [...athlete.entries, newEntry];
  
  return {
    ...athlete,
    entries: updatedEntries,
    totals: calculateTotals(updatedEntries),
  };
};

export const removeLastEntry = (athlete: Athlete): Athlete => {
  if (athlete.entries.length === 0) return athlete;
  
  const updatedEntries = athlete.entries.slice(0, -1);
  
  return {
    ...athlete,
    entries: updatedEntries,
    totals: calculateTotals(updatedEntries),
  };
};

export const exportToCSV = (session: Session): string => {
  const headers = [
    "date",
    "athlete",
    "entry_index",
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
        session.dateISO.split("T")[0],
        athlete.name,
        entry.index.toString(),
        entry.errors.toString(),
        entry.timestampISO,
        errorsSoFar.toString(),
      ]);
    });
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
