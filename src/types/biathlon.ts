export type Shot = { hit: boolean };

export type ShootingRound = {
  index: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  shots: Shot[];
  errors: number;
};

export type Athlete = {
  id: string;
  name: string;
  rounds: ShootingRound[];
  totals: {
    errors: number;
    hits: number;
  };
};

export type Session = {
  id: string;
  dateISO: string;
  athletes: Athlete[];
};
