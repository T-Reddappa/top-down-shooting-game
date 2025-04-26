export interface Position {
  x: number;
  y: number;
}

export enum PowerupType {
  DAMAGE_BOOST = "DAMAGE_BOOST",
  RAPID_FIRE = "RAPID_FIRE",
  SHIELD = "SHIELD",
  HEALTH_RESTORE = "HEALTH_RESTORE",
  SPEED_BOOST = "SPEED_BOOST",
}

export interface Player {
  id: string;
  userId: string;
  username: string;
  position: Position;
  direction: number;
  health: number;
  kills: number;
  lastShotTime: number;
  // Add new properties
  score: number;
  respawnTime?: number;
  powerups: PowerupType[];
}

export interface Projectile {
  id: string;
  playerId: string;
  position: Position;
  direction: number;
  speed: number;
  createdAt: number;
  // Add new properties
  damage: number;
  size: number;
}

export interface PlayerUpdate {
  id: string;
  position: Position;
  direction: number;
  shooting: boolean;
}

export interface GameState {
  players: Record<string, Player>;
  projectiles: Projectile[];
  lastUpdateTime: number;
  // Add new properties
  powerups: Powerup[];
  obstacles: Obstacle[];
}

export interface GameSettings {
  mapWidth: number;
  mapHeight: number;
  playerSpeed: number;
  projectileSpeed: number;
  projectileLifetime: number; // ms
  playerHitboxRadius: number;
  projectileHitboxRadius: number;
  collisionDamage: number;
  shootingCooldown: number; // ms

  // Add these missing settings:
  respawnTime: number; // ms
  powerupSpawnRate: number; // ms
  powerupDuration: number; // ms
}

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

export interface Powerup {
  id: string;
  type: PowerupType;
  position: Position;
  radius: number;
  createdAt: number;
}

export interface Obstacle {
  id: string;
  position: Position;
  width: number;
  height: number;
}

export interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  obstacles: Obstacle[];
  spawns: Position[];
}
