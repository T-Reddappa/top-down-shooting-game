import { v4 as uuidv4 } from "uuid";
import {
  GameState,
  GameSettings,
  Player,
  Projectile,
  PlayerUpdate,
  Powerup,
  PowerupType,
  Obstacle,
  Position,
} from "@repo/types/types";

export class GameManager {
  private gameState: GameState;
  private settings: GameSettings;
  private maps: Record<string, { obstacles: Obstacle[]; spawns: Position[] }>;
  private currentMap: string;
  private lastPowerupSpawn: number;

  constructor(settings: GameSettings) {
    this.settings = settings;
    this.lastPowerupSpawn = Date.now();

    // Setup maps
    this.maps = {
      default: {
        obstacles: [
          { id: "obs1", position: { x: 100, y: 100 }, width: 100, height: 100 },
          { id: "obs2", position: { x: 500, y: 380 }, width: 80, height: 80 },
          { id: "obs3", position: { x: 400, y: 250 }, width: 50, height: 50 },
        ],
        spawns: [
          { x: 50, y: 50 },
          { x: 750, y: 50 },
          { x: 50, y: 550 },
          { x: 750, y: 550 },
        ],
      },
    };

    this.currentMap = "default";

    this.gameState = {
      players: {},
      projectiles: [],
      powerups: [],
      obstacles: [...this.maps[this.currentMap].obstacles],
      lastUpdateTime: Date.now(),
    };
  }

  // Get the current game state
  getGameState(): GameState {
    return this.gameState;
  }

  // Get a specific player by ID
  getPlayer(playerId: string): Player | null {
    return this.gameState.players[playerId] || null;
  }

  // Add a new player to the game
  addPlayer(player: Player): void {
    // Choose a random spawn point
    const spawns = this.maps[this.currentMap].spawns;
    const spawnPoint = spawns[Math.floor(Math.random() * spawns.length)];

    // Initialize player with default values
    this.gameState.players[player.id] = {
      ...player,
      position: spawnPoint,
      health: 100,
      kills: 0,
      score: 0,
      lastShotTime: 0,
      powerups: [],
    };
  }

  // Remove a player from the game
  removePlayer(playerId: string): void {
    delete this.gameState.players[playerId];
  }

  // Update player based on client input
  updatePlayer(update: PlayerUpdate): void {
    const player = this.gameState.players[update.id];

    if (!player) return;

    // Check if player is waiting for respawn
    if (player.respawnTime && player.respawnTime > Date.now()) {
      return;
    }

    // Remove respawn timer if present
    if (player.respawnTime) {
      delete player.respawnTime;
    }

    // Calculate movement with collision detection
    const newPosition = this.calculateMovementWithCollision(
      player.position,
      update.position
    );

    // Update position and direction
    player.position = newPosition;
    player.direction = update.direction;

    // Handle shooting
    if (update.shooting) {
      const currentTime = Date.now();

      // Get adjusted cooldown (may be affected by powerups)
      const adjustedCooldown = this.getAdjustedShootingCooldown(player);

      // Check cooldown
      if (currentTime - player.lastShotTime > adjustedCooldown) {
        this.createProjectile(player);
        player.lastShotTime = currentTime;
      }
    }
  }

  // Create a new projectile
  private createProjectile(player: Player): void {
    // Get adjusted damage (may be affected by powerups)
    const adjustedDamage = this.getAdjustedProjectileDamage(player);

    const projectile: Projectile = {
      id: uuidv4(),
      playerId: player.id,
      position: { ...player.position },
      direction: player.direction,
      speed: this.settings.projectileSpeed,
      createdAt: Date.now(),
      damage: adjustedDamage,
      size: this.settings.projectileHitboxRadius,
    };

    this.gameState.projectiles.push(projectile);
  }

  // Calculate player movement with obstacle collision detection
  private calculateMovementWithCollision(
    currentPos: Position,
    targetPos: Position
  ): Position {
    // Check bounds first
    let newPosition = {
      x: Math.max(
        this.settings.playerHitboxRadius,
        Math.min(
          this.settings.mapWidth - this.settings.playerHitboxRadius,
          targetPos.x
        )
      ),
      y: Math.max(
        this.settings.playerHitboxRadius,
        Math.min(
          this.settings.mapHeight - this.settings.playerHitboxRadius,
          targetPos.y
        )
      ),
    };

    // Check obstacle collisions
    for (const obstacle of this.gameState.obstacles) {
      // Simple AABB collision with player radius
      const playerLeft = newPosition.x - this.settings.playerHitboxRadius;
      const playerRight = newPosition.x + this.settings.playerHitboxRadius;
      const playerTop = newPosition.y - this.settings.playerHitboxRadius;
      const playerBottom = newPosition.y + this.settings.playerHitboxRadius;

      const obstacleLeft = obstacle.position.x;
      const obstacleRight = obstacle.position.x + obstacle.width;
      const obstacleTop = obstacle.position.y;
      const obstacleBottom = obstacle.position.y + obstacle.height;

      if (
        playerRight > obstacleLeft &&
        playerLeft < obstacleRight &&
        playerBottom > obstacleTop &&
        playerTop < obstacleBottom
      ) {
        // Collision detected, resolve by moving player back
        // Find the minimum distance to move out of collision
        const distRight = obstacleRight - playerLeft;
        const distLeft = playerRight - obstacleLeft;
        const distBottom = obstacleBottom - playerTop;
        const distTop = playerBottom - obstacleTop;

        // Find the minimum penetration distance
        const minDist = Math.min(distRight, distLeft, distBottom, distTop);

        // Resolve along the minimum axis
        if (minDist === distRight) {
          newPosition.x = obstacleRight + this.settings.playerHitboxRadius;
        } else if (minDist === distLeft) {
          newPosition.x = obstacleLeft - this.settings.playerHitboxRadius;
        } else if (minDist === distBottom) {
          newPosition.y = obstacleBottom + this.settings.playerHitboxRadius;
        } else if (minDist === distTop) {
          newPosition.y = obstacleTop - this.settings.playerHitboxRadius;
        }
      }
    }

    return newPosition;
  }

  // Main game update loop
  update(): void {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.gameState.lastUpdateTime;
    this.gameState.lastUpdateTime = currentTime;

    // Update projectiles
    this.updateProjectiles(currentTime);

    // Check for collisions
    this.checkProjectileCollisions();

    // Check for powerup collisions
    this.checkPowerupCollisions();

    // Update powerups
    this.updatePowerups(currentTime);

    // Spawn new powerups
    this.spawnPowerups(currentTime);

    // Check player respawns
    this.checkPlayerRespawns(currentTime);
  }

  // Update projectile positions and lifetimes
  private updateProjectiles(currentTime: number): void {
    this.gameState.projectiles = this.gameState.projectiles.filter(
      (projectile) => {
        // Move projectile
        const newPosition = {
          x:
            projectile.position.x +
            Math.cos(projectile.direction) * projectile.speed,
          y:
            projectile.position.y +
            Math.sin(projectile.direction) * projectile.speed,
        };

        // Check obstacle collisions
        for (const obstacle of this.gameState.obstacles) {
          // Simple AABB collision with projectile radius
          const projectileLeft = newPosition.x - projectile.size;
          const projectileRight = newPosition.x + projectile.size;
          const projectileTop = newPosition.y - projectile.size;
          const projectileBottom = newPosition.y + projectile.size;

          const obstacleLeft = obstacle.position.x;
          const obstacleRight = obstacle.position.x + obstacle.width;
          const obstacleTop = obstacle.position.y;
          const obstacleBottom = obstacle.position.y + obstacle.height;

          // If projectile collides with obstacle, remove it
          if (
            projectileRight > obstacleLeft &&
            projectileLeft < obstacleRight &&
            projectileBottom > obstacleTop &&
            projectileTop < obstacleBottom
          ) {
            return false;
          }
        }

        // Update position
        projectile.position = newPosition;

        // Check if projectile has expired
        const isExpired =
          currentTime - projectile.createdAt > this.settings.projectileLifetime;

        // Check if projectile is out of bounds
        const isOutOfBounds =
          projectile.position.x < 0 ||
          projectile.position.x > this.settings.mapWidth ||
          projectile.position.y < 0 ||
          projectile.position.y > this.settings.mapHeight;

        return !isExpired && !isOutOfBounds;
      }
    );
  }

  // Check for collisions between projectiles and players
  private checkProjectileCollisions(): void {
    // For each projectile
    for (let i = this.gameState.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.gameState.projectiles[i];
      let hasCollided = false;

      // Check against each player
      Object.values(this.gameState.players).forEach((player) => {
        // Skip collision with the player who fired
        if (player.id === projectile.playerId) return;

        // Skip players who are respawning
        if (player.respawnTime && player.respawnTime > Date.now()) return;

        // Calculate distance between projectile and player
        const dx = player.position.x - projectile.position.x;
        const dy = player.position.y - projectile.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if collision occurred
        if (distance < this.settings.playerHitboxRadius + projectile.size) {
          // Apply damage to player (may be modified by shield powerup)
          const actualDamage = this.calculateDamageWithShield(
            player,
            projectile.damage
          );
          player.health -= actualDamage;

          // If player health is depleted
          if (player.health <= 0) {
            // Award kill and score to shooter
            const shooter = this.gameState.players[projectile.playerId];
            if (shooter) {
              shooter.kills += 1;
              shooter.score += 100; // Base kill score
            }

            // Set player respawn time
            player.respawnTime = Date.now() + this.settings.respawnTime;

            // Clear powerups
            player.powerups = [];
          }

          // Mark projectile for removal
          hasCollided = true;
        }
      });

      // Remove projectile if it collided with a player
      if (hasCollided) {
        this.gameState.projectiles.splice(i, 1);
      }
    }
  }

  // Calculate damage considering shield powerup
  private calculateDamageWithShield(player: Player, damage: number): number {
    if (player.powerups.includes(PowerupType.SHIELD)) {
      return damage * 0.5; // Shield reduces damage by 50%
    }
    return damage;
  }

  // Check for respawning players
  private checkPlayerRespawns(currentTime: number): void {
    Object.values(this.gameState.players).forEach((player) => {
      if (player.respawnTime && player.respawnTime <= currentTime) {
        // Reset player health and respawn them
        player.health = 100;

        // Choose random spawn point
        const spawns = this.maps[this.currentMap].spawns;
        const spawnPoint = spawns[Math.floor(Math.random() * spawns.length)];
        player.position = { ...spawnPoint };

        // Clear respawn time
        delete player.respawnTime;
      }
    });
  }

  // Spawn powerups periodically
  private spawnPowerups(currentTime: number): void {
    if (currentTime - this.lastPowerupSpawn > this.settings.powerupSpawnRate) {
      this.lastPowerupSpawn = currentTime;

      // Don't spawn too many powerups
      if (this.gameState.powerups.length >= 5) return;

      // Choose a random powerup type
      const powerupTypes = Object.values(PowerupType);
      const randomType =
        powerupTypes[Math.floor(Math.random() * powerupTypes.length)];

      // Find a valid position (not in an obstacle)
      let validPosition = false;
      let position: Position;

      while (!validPosition) {
        position = {
          x: Math.random() * (this.settings.mapWidth - 60) + 30,
          y: Math.random() * (this.settings.mapHeight - 60) + 30,
        };

        // Check if position overlaps with obstacles
        validPosition = !this.gameState.obstacles.some((obstacle) => {
          return (
            position.x + 15 > obstacle.position.x &&
            position.x - 15 < obstacle.position.x + obstacle.width &&
            position.y + 15 > obstacle.position.y &&
            position.y - 15 < obstacle.position.y + obstacle.height
          );
        });
      }

      // Create powerup
      const powerup: Powerup = {
        id: uuidv4(),
        type: randomType,
        position: position!,
        radius: 15,
        createdAt: currentTime,
      };

      this.gameState.powerups.push(powerup);
    }
  }

  // Check for players collecting powerups
  private checkPowerupCollisions(): void {
    for (let i = this.gameState.powerups.length - 1; i >= 0; i--) {
      const powerup = this.gameState.powerups[i];

      Object.values(this.gameState.players).forEach((player) => {
        // Skip players who are respawning
        if (player.respawnTime && player.respawnTime > Date.now()) return;

        // Calculate distance
        const dx = player.position.x - powerup.position.x;
        const dy = player.position.y - powerup.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if player collected powerup
        if (distance < this.settings.playerHitboxRadius + powerup.radius) {
          // Apply powerup effect
          this.applyPowerup(player, powerup.type);

          // Remove powerup from game
          this.gameState.powerups.splice(i, 1);
          return;
        }
      });
    }
  }

  // Apply powerup effect to player
  private applyPowerup(player: Player, type: PowerupType): void {
    // Add powerup to player's active powerups
    if (!player.powerups.includes(type)) {
      player.powerups.push(type);

      // For health restore, apply immediately
      if (type === PowerupType.HEALTH_RESTORE) {
        player.health = Math.min(100, player.health + 50);

        // Remove from active powerups as it's a one-time effect
        const index = player.powerups.indexOf(type);
        if (index !== -1) {
          player.powerups.splice(index, 1);
        }
      }

      // Schedule powerup removal after duration
      if (type !== PowerupType.HEALTH_RESTORE) {
        setTimeout(() => {
          const index = player.powerups.indexOf(type);
          if (index !== -1) {
            player.powerups.splice(index, 1);
          }
        }, this.settings.powerupDuration);
      }
    }
  }

  // Update powerups (remove expired ones)
  private updatePowerups(currentTime: number): void {
    // Remove powerups that have been around too long
    const powerupLifetime = 30000; // 30 seconds
    this.gameState.powerups = this.gameState.powerups.filter((powerup) => {
      return currentTime - powerup.createdAt < powerupLifetime;
    });
  }

  // Get adjusted shooting cooldown based on player powerups
  private getAdjustedShootingCooldown(player: Player): number {
    let cooldown = this.settings.shootingCooldown;

    if (player.powerups.includes(PowerupType.RAPID_FIRE)) {
      cooldown *= 0.5; // 50% faster firing rate
    }

    return cooldown;
  }

  // Get adjusted projectile damage based on player powerups
  private getAdjustedProjectileDamage(player: Player): number {
    let damage = this.settings.collisionDamage;

    if (player.powerups.includes(PowerupType.DAMAGE_BOOST)) {
      damage *= 1.5; // 50% more damage
    }

    return damage;
  }
}
