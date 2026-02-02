export type InitResponse = {
  type: 'init';
  postId: string;
  username: string;
  snoovatarUrl: string;
  previousTime: string;
};

export type StoredState = {
  username: string;
  level?: number;
  bestScore?: number;
  data?: Record<string, unknown>;
  updatedAt: number;
};

export type StateUpsertRequest = {
  level?: number;
  data?: Record<string, unknown>;
};

export type ScoreSubmitRequest = {
  score: number;
};

export type ScoreSubmitResponse = {
  username: string;
  score: number;
  updatedAt: number;
};

export type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
};

export type LeaderboardResponse = {
  top: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  totalPlayers: number;
  generatedAt: number;
};
