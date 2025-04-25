// apps/web/src/components/GameControls.tsx
import React, { useEffect, useState, useRef } from "react";
import { useGame } from "../contexts/GameContext";
import { Position } from "@top-down-game/types";

interface GameControlsProps {
  canvasWidth: number;
  canvasHeight: number;
}

const GameControls: React.FC<GameControlsProps> = ({
  canvasWidth,
  canvasHeight,
}) => {
  const { gameState, playerId, updatePlayerMovement } = useGame();

  // Player movement state
  const [position, setPosition] = useState<Position>({
    x: canvasWidth / 2,
    y: canvasHeight / 2,
  });
  const [direction, setDirection] = useState<number>(0);
  const [shooting, setShooting] = useState<boolean>(false);

  // Keys held down tracking
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Get current player from game state
  const currentPlayer = playerId && gameState?.players[playerId];

  // Sync position with server state
  useEffect(() => {
    if (currentPlayer) {
      setPosition(currentPlayer.position);
    }
  }, [currentPlayer]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;

      // Handle space key for shooting
      if (e.key === " ") {
        setShooting(true);
        setTimeout(() => setShooting(false), 100);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Handle mouse movement for aiming
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!currentPlayer) return;

      const canvasElement = document.querySelector("canvas");
      if (!canvasElement) return;

      const rect = canvasElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate angle between player and mouse
      const dx = mouseX - position.x;
      const dy = mouseY - position.y;
      const angle = Math.atan2(dy, dx);

      setDirection(angle);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [currentPlayer, position]);

  // Handle mouse click for shooting
  useEffect(() => {
    const handleMouseDown = () => {
      setShooting(true);
    };

    const handleMouseUp = () => {
      setShooting(false);
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Game loop for movement
  useEffect(() => {
    if (!playerId || !gameState) return;

    const gameLoop = setInterval(() => {
      let newX = position.x;
      let newY = position.y;
      const moveSpeed = 5;

      // Calculate movement based on keys pressed
      if (keysPressed.current["w"]) newY -= moveSpeed;
      if (keysPressed.current["s"]) newY += moveSpeed;
      if (keysPressed.current["a"]) newX -= moveSpeed;
      if (keysPressed.current["d"]) newX += moveSpeed;

      // Limit movement to canvas boundaries
      newX = Math.max(20, Math.min(canvasWidth - 20, newX));
      newY = Math.max(20, Math.min(canvasHeight - 20, newY));

      // Only update if position changed
      if (newX !== position.x || newY !== position.y) {
        const newPosition = { x: newX, y: newY };
        setPosition(newPosition);
        updatePlayerMovement(newPosition, direction, shooting);
      } else if (shooting) {
        // Update if shooting even if position didn't change
        updatePlayerMovement(position, direction, shooting);
      }
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [
    playerId,
    gameState,
    position,
    direction,
    shooting,
    canvasWidth,
    canvasHeight,
    updatePlayerMovement,
  ]);

  return null; // This is a behavior component, not a visual one
};

export default GameControls;
