export interface Vector2D {
    x: number;
    y: number;
}
export interface Player {
    id: string;
    userId?: string;
    username: string;
    position: Vector2D;
    direction: number;
    health: number;
    kills: number;
    lastShotTime: number;
}
export interface Projectile {
    id: string;
    playerId: string;
    position: Vector2D;
    direction: number;
    speed: number;
    createdAt: number;
}
export interface GameState {
    players: Record<string, Player>;
    projectiles: Projectile[];
    lastUpdateTime: number;
}
export interface PlayerUpdate {
    id: string;
    position: Vector2D;
    direction: number;
    shooting: boolean;
}
export interface GameSettings {
    mapWidth: number;
    mapHeight: number;
    playerSpeed: number;
    projectileSpeed: number;
    projectileLifetime: number;
    playerHitboxRadius: number;
    projectileHitboxRadius: number;
    collisionDamage: number;
    shootingCooldown: number;
}
//# sourceMappingURL=game.d.ts.map