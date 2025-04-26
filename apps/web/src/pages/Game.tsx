import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useGame } from "../contexts/GameContext";
import GameCanvas from "../components/GameCanvas";
import GameControls from "../components/GameControls";
import GameHUD from "../components/GameHUD";

const Game: React.FC = () => {
  const { user } = useAuth();
  const { connected, joinGame, leaveGame } = useGame();
  const navigate = useNavigate();
  const [gameSize, setGameSize] = useState({ width: 800, height: 600 });

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Join game on mount
  useEffect(() => {
    console.log("connect1");
    // Only join if not already connected and user exists
    if (user && !connected) {
      console.log("connect2");
      joinGame();
    }

    // Only disconnect when component unmounts, not on dependency changes
    return () => {
      // Only leave the game if we're actually connected
      if (connected) {
        leaveGame();
      }
    };
  }, [user]);

  // Update game canvas size based on window size
  useEffect(() => {
    const updateSize = () => {
      const maxWidth = Math.min(window.innerWidth - 40, 1200);
      const maxHeight = Math.min(window.innerHeight - 100, 800);

      // Maintain aspect ratio
      const aspectRatio = 4 / 3;

      let width = maxWidth;
      let height = width / aspectRatio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      setGameSize({ width, height });
    };

    window.addEventListener("resize", updateSize);
    updateSize();

    return () => window.removeEventListener("resize", updateSize);
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col items-center max-w-6xl mx-auto px-4 py-6 bg-gray-600">
      <div className="w-full flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Top-Down Shooter</h1>
        <div className="flex space-x-4">
          <div
            className={`flex items-center ${connected ? "text-green-600" : "text-red-600"}`}
          >
            <span
              className={`h-3 w-3 rounded-full ${connected ? "bg-green-600" : "bg-red-600"} mr-2`}
            ></span>
            <span>{connected ? "Connected" : "Disconnected"}</span>
          </div>
          <button
            onClick={() => navigate("/")}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Home
          </button>
        </div>
      </div>

      <div className="relative w-full" style={{ maxWidth: gameSize.width }}>
        {connected ? (
          <>
            <GameCanvas width={gameSize.width} height={gameSize.height} />
            <GameControls
              canvasWidth={gameSize.width}
              canvasHeight={gameSize.height}
            />
            <GameHUD />
          </>
        ) : (
          <div
            className="bg-gray-200 flex items-center justify-center"
            style={{ width: gameSize.width, height: gameSize.height }}
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-lg">Connecting to game server...</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 bg-white p-4 rounded shadow w-full">
        <h2 className="font-bold text-lg mb-2">Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold">Movement</h3>
            <ul className="list-disc pl-5">
              <li>W - Move Up</li>
              <li>A - Move Left</li>
              <li>S - Move Down</li>
              <li>D - Move Right</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold">Combat</h3>
            <ul className="list-disc pl-5">
              <li>Mouse - Aim</li>
              <li>Left Click - Shoot</li>
              <li>Spacebar - Alternative Shoot</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
