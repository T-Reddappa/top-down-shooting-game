// apps/web/src/contexts/GameContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { GameState, PlayerUpdate, Position } from "@repo/types/types";

interface GameContextType {
  connected: boolean;
  gameState: GameState | null;
  playerId: string | null;
  joinGame: () => void;
  leaveGame: () => void;
  updatePlayerMovement: (
    position: Position,
    direction: number,
    shooting: boolean
  ) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, token } = useAuth();
  const [connected, setConnected] = useState<boolean>(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize and cleanup socket connection
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const joinGame = () => {
    if (!user || !token) {
      console.error("Cannot join game: User or token missing", {
        user,
        token: !!token,
      });
      return;
    }

    // Create socket connection if not exists
    if (!socketRef.current) {
      console.log("Creating new socket connection");
      socketRef.current = io("http://localhost:3002", {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      });

      // Setup socket event listeners
      socketRef.current.on("connect", () => {
        setConnected(true);
        console.log("Connected to game server");

        // Join game after connection
        socketRef.current?.emit("join-game", { username: user.username });
      });

      socketRef.current.on("error", (error) => {
        console.error("Socket error:", error);
      });

      // Also log any errors from the server
      socketRef.current.on("connect_error", (error) => {
        console.error("Connection error:", error);
        console.error("Error details:", {
          message: error.message,
        });
      });

      socketRef.current.on("disconnect", (reason) => {
        setConnected(false);
        setPlayerId(null);
        setGameState(null);
        console.log("Disconnect reason:", reason);
        console.log("Disconnected from game server");

        // Try to reconnect if not manually disconnected
        if (
          reason !== "io client disconnect" &&
          reason !== "io server disconnect"
        ) {
          console.log("Attempting to reconnect...");
          setTimeout(() => {
            if (socketRef.current) {
              socketRef.current.connect();
            }
          }, 1000);
        }
      });

      socketRef.current.on(
        "game-joined",
        (data: { id: string; initialState: GameState }) => {
          setPlayerId(data.id);
          setGameState(data.initialState);
          console.log("Joined game with ID:", data.id);
        }
      );

      socketRef.current.on("game-state-update", (updatedState: GameState) => {
        setGameState(updatedState);
      });
    } else if (socketRef.current.disconnected) {
      socketRef.current.connect();
    }
  };

  const leaveGame = () => {
    if (socketRef.current) {
      // socketRef.current.disconnect();
      console.log("tried to disconnect");
      setConnected(false);
      setPlayerId(null);
      setGameState(null);
    }
  };

  const updatePlayerMovement = (
    position: Position,
    direction: number,
    shooting: boolean
  ) => {
    if (!connected || !socketRef.current || !playerId) return;

    const update: PlayerUpdate = {
      id: playerId,
      position,
      direction,
      shooting,
    };

    socketRef.current.emit("player-update", update);
  };

  return (
    <GameContext.Provider
      value={{
        connected,
        gameState,
        playerId,
        joinGame,
        leaveGame,
        updatePlayerMovement,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
