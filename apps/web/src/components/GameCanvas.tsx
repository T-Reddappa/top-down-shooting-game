import React, { useRef, useEffect } from "react";
import { useGame } from "../contexts/GameContext";
import { PowerupType } from "@repo/types/types";

interface GameCanvasProps {
  width: number;
  height: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState, playerId } = useGame();

  // Get powerup color based on type
  const getPowerupColor = (type: PowerupType): string => {
    switch (type) {
      case PowerupType.SPEED_BOOST:
        return "#3498db"; // Blue
      case PowerupType.DAMAGE_BOOST:
        return "#e74c3c"; // Red
      case PowerupType.HEALTH_RESTORE:
        return "#2ecc71"; // Green
      case PowerupType.RAPID_FIRE:
        return "#f39c12"; // Orange
      case PowerupType.SHIELD:
        return "#9b59b6"; // Purple
      default:
        return "#95a5a6"; // Gray
    }
  };

  // Get powerup icon based on type
  const drawPowerupIcon = (
    ctx: CanvasRenderingContext2D,
    type: PowerupType,
    x: number,
    y: number,
    size: number
  ) => {
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${size}px Arial`;

    switch (type) {
      case PowerupType.SPEED_BOOST:
        ctx.fillText("S", x, y);
        break;
      case PowerupType.DAMAGE_BOOST:
        ctx.fillText("D", x, y);
        break;
      case PowerupType.HEALTH_RESTORE:
        ctx.fillText("H", x, y);
        break;
      case PowerupType.RAPID_FIRE:
        ctx.fillText("R", x, y);
        break;
      case PowerupType.SHIELD:
        ctx.fillText("P", x, y); // P for Protection
        break;
    }
  };

  // Draw the game state on the canvas
  useEffect(() => {
    if (!canvasRef.current || !gameState) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = "#F9F6EE";
    ctx.fillRect(0, 0, width, height);

    // Draw border
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Draw obstacles
    ctx.fillStyle = "#95a5a6";
    gameState.obstacles.forEach((obstacle) => {
      ctx.fillRect(
        obstacle.position.x,
        obstacle.position.y,
        obstacle.width,
        obstacle.height
      );
    });

    // Draw powerups
    gameState.powerups.forEach((powerup) => {
      const { position, type, radius } = powerup;

      // Draw powerup circle
      ctx.fillStyle = getPowerupColor(type);
      ctx.beginPath();
      ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw powerup icon
      drawPowerupIcon(ctx, type, position.x, position.y, radius);

      // Add pulsing effect
      const pulseRadius = radius + 2 * Math.sin(Date.now() / 200);
      ctx.strokeStyle = getPowerupColor(type);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(position.x, position.y, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw projectiles
    gameState.projectiles.forEach((projectile) => {
      const { position } = projectile;

      ctx.fillStyle = "#ff4500";
      ctx.beginPath();
      ctx.arc(position.x, position.y, projectile.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw players
    Object.values(gameState.players).forEach((player) => {
      const { position, direction, health, powerups } = player;
      const isCurrentPlayer = player.id === playerId;
      const isRespawning =
        player.respawnTime && player.respawnTime > Date.now();

      if (isRespawning) {
        // Draw respawning player as a ghost
        ctx.globalAlpha = 0.3;
      }

      // Draw player body
      ctx.fillStyle = isCurrentPlayer ? "#3498db" : "#e74c3c";
      ctx.beginPath();
      ctx.arc(position.x, position.y, 20, 0, Math.PI * 2);
      ctx.fill();

      // Draw powerup effects
      if (powerups.includes(PowerupType.SHIELD)) {
        ctx.strokeStyle = "#9b59b6";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(position.x, position.y, 26, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (powerups.includes(PowerupType.SPEED_BOOST)) {
        ctx.fillStyle = "#3498db";
        ctx.beginPath();
        ctx.arc(position.x, position.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (powerups.includes(PowerupType.DAMAGE_BOOST)) {
        ctx.fillStyle = "#e74c3c";
        ctx.beginPath();
        ctx.arc(position.x, position.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      if (powerups.includes(PowerupType.RAPID_FIRE)) {
        ctx.strokeStyle = "#f39c12";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(position.x, position.y, 23, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw direction indicator
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(position.x, position.y);
      ctx.lineTo(
        position.x + Math.cos(direction) * 25,
        position.y + Math.sin(direction) * 25
      );
      ctx.stroke();

      // Draw username
      ctx.fillStyle = "#000";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(player.username, position.x, position.y - 30);

      // Draw health bar
      const healthBarWidth = 40;
      const healthBarHeight = 5;

      ctx.fillStyle = "#333";
      ctx.fillRect(
        position.x - healthBarWidth / 2,
        position.y - 25,
        healthBarWidth,
        healthBarHeight
      );

      ctx.fillStyle = health > 30 ? "#2ecc71" : "#e74c3c";
      ctx.fillRect(
        position.x - healthBarWidth / 2,
        position.y - 25,
        (health / 100) * healthBarWidth,
        healthBarHeight
      );

      // Show score above player
      ctx.fillStyle = "#000";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`Score: ${player.score}`, position.x, position.y - 40);

      // Reset alpha if player was respawning
      if (isRespawning) {
        ctx.globalAlpha = 1.0;
      }
    });

    // Draw minimap
    const minimapSize = 150;
    const minimapX = 0;
    const minimapY = 300;
    const minimapScale = minimapSize / Math.max(width, height);

    // Draw minimap background
    ctx.fillStyle = "#fff";
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);

    // Draw obstacles on minimap
    ctx.fillStyle = "#95a5a6";
    gameState.obstacles.forEach((obstacle) => {
      ctx.fillRect(
        minimapX + obstacle.position.x * minimapScale,
        minimapY + obstacle.position.y * minimapScale,
        obstacle.width * minimapScale,
        obstacle.height * minimapScale
      );
    });

    // Draw players on minimap
    Object.values(gameState.players).forEach((player) => {
      const isCurrentPlayer = player.id === playerId;
      ctx.fillStyle = isCurrentPlayer ? "#3498db" : "#e74c3c";

      ctx.beginPath();
      ctx.arc(
        minimapX + player.position.x * minimapScale,
        minimapY + player.position.y * minimapScale,
        3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Draw powerups on minimap
    gameState.powerups.forEach((powerup) => {
      ctx.fillStyle = getPowerupColor(powerup.type);

      ctx.beginPath();
      ctx.arc(
        minimapX + powerup.position.x * minimapScale,
        minimapY + powerup.position.y * minimapScale,
        2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
  }, [gameState, playerId, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: "block", margin: "0 auto" }}
    />
  );
};

export default GameCanvas;
