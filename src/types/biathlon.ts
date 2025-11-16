export type ShotEntry = {
  index: number;
  errors: 0 | 1 | 2 | 3 | 4 | 5;
  timestampISO: string;
};

export type Athlete = {
  id: string;
  name: string;
  entries: ShotEntry[];
  totals: {
    errors: number;
    count: number;
    avgErrors: number;
  };
};

export type Session = {
  id: string;
  dateISO: string;
  athletes: Athlete[];
};
