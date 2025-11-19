export type ID = string;
export type TimestampISO = string;
export type ErrorCount = 0 | 1 | 2 | 3 | 4 | 5;
export type ShotPosition = 'prone' | 'standing' | 'unknown';

export type ShotEntry = {
  id: ID;
  index: number;
  errors: ErrorCount;
  position: ShotPosition;
  timestampISO: TimestampISO;
  editedAt?: TimestampISO;
};

export type AthleteMaster = {
  id: ID;
  name: string;
  createdAt: TimestampISO;
  updatedAt: TimestampISO;
  archived?: boolean;
  profileEnabled?: boolean;
};

export type SessionAthlete = {
  athleteId: ID;
  nameSnapshot: string;
  entries: ShotEntry[];
  totals: {
    errors: number;
    count: number;
    avgErrors: number;
  };
};

export type SessionStatus = 'active' | 'completed';

export type Session = {
  id: ID;
  name: string;
  dateISO: string;
  status: SessionStatus;
  athletes: SessionAthlete[];
  createdAt: TimestampISO;
  completedAt?: TimestampISO;
};

export type ProfileSessionSummary = {
  sessionId: ID;
  sessionName: string;
  dateISO: string;
  
  shotsTotal: number;
  hitsTotal: number;
  hitRatePct: number;
  
  proneShots: number;
  proneHits: number;
  proneHitRatePct: number;
  
  standingShots: number;
  standingHits: number;
  standingHitRatePct: number;
};

export type AthleteProfile = {
  athleteId: ID;
  summaries: ProfileSessionSummary[];
  updatedAt: TimestampISO;
};

export type AppState = {
  roster: AthleteMaster[];
  sessions: Session[];
  profiles: Record<ID, AthleteProfile>;
  currentSessionId?: ID;
  version: number;
};
