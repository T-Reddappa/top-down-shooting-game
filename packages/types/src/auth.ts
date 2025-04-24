export interface User {
  id: string;
  username: string;
  createdAt: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PlayerStats {
  username: string;
  totalKills: number;
  totalDeaths: number;
  totalScore: number;
  matchesPlayed: number;
}
