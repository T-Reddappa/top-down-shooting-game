// apps/web/src/components/GameHUD.tsx
import React from "react";
import { useGame } from "../contexts/GameContext";

const GameHUD: React.FC = () => {
  const { gameState, playerId } = useGame();

  if (!gameState || !playerId) return null;

  const currentPlayer = gameState.players[playerId];
  if (!currentPlayer) return null;

  // Sort players by kills to show top players
  const sortedPlayers = Object.values(gameState.players)
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 5);

  return (
    <div className="absolute top-0 left-0 right-0 flex justify-between p-4 text-white">
      {/* Player stats */}
      <div className="bg-gray-800 bg-opacity-70 p-3 rounded">
        <div className="font-bold text-lg">{currentPlayer.username}</div>
        <div className="flex space-x-4 text-sm mt-1">
          <div>
            Health: <span className="font-bold">{currentPlayer.health}%</span>
          </div>
          <div>
            Kills: <span className="font-bold">{currentPlayer.kills}</span>
          </div>
        </div>
      </div>

      {/* Minimap or other game info could go here */}
      <div className="bg-gray-800 bg-opacity-70 p-3 rounded">
        <div className="font-bold mb-1">Top Players</div>
        <div className="text-sm">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex justify-between ${player.id === playerId ? "text-yellow-300" : ""}`}
            >
              <span>
                {index + 1}. {player.username}
              </span>
              <span className="ml-4">{player.kills}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
