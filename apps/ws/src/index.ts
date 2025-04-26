import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { GameManager } from "./game/gameManager";
import { GameSettings, Player, PlayerUpdate } from "@repo/types/types";
import { prismaClient } from "@repo/db";
import { RoomManager } from "./game/roomManager";

// Load environment variables
dotenv.config();

// Create HTTP server
const server = http.createServer();

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true,
  allowUpgrades: true,
  upgradeTimeout: 30000,
});

// Add debug logging for server events
io.engine.on("connection_error", (err) => {
  console.error("Connection error:", err);
});

// io.engine.on("headers", (headers, req) => {
//   console.log("Headers:", headers);
// });

// Game settings
const gameSettings: GameSettings = {
  mapWidth: 800,
  mapHeight: 600,
  playerSpeed: 5,
  projectileSpeed: 15,
  projectileLifetime: 1000, // ms
  playerHitboxRadius: 20,
  projectileHitboxRadius: 5,
  collisionDamage: 20,
  shootingCooldown: 250, // ms
  respawnTime: 3000, // 3 seconds
  powerupSpawnRate: 15000, // 15 seconds
  powerupDuration: 10000, // 10 seconds
};

const roomManager = new RoomManager(gameSettings);

// Initialize game manager
// const gameManager = new GameManager(gameSettings);

//Create a default public room
const defaultRoom = roomManager.createRoom("Public Game", 5, false);
console.log(`Created default room: ${defaultRoom.id}`);

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    console.log("Authentication attempt for socket:", socket.id);
    const token = socket.handshake.auth.token;
    console.log("Token received:", token ? "Yes" : "No");

    if (!token) {
      console.log("Authentication failed: No token provided");
      return next(new Error("Authentication token required"));
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "shooting-app"
    ) as { id: string; username: string };

    console.log("Token decoded successfully:", decoded);
    // Check if user exists
    const user = await prismaClient.user.findUnique({
      where: { id: decoded.id },
    });
    console.log("User found:", user ? "Yes" : "No");

    if (!user) {
      console.log("Authentication failed: User not found");
      return next(new Error("User not found"));
    }

    // Attach user data to socket
    socket.data.user = {
      id: user.id,
      username: user.username,
    };

    console.log("Authentication successful for user:", user.username);
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return next(new Error("Invalid token"));
  }
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Add error handler for this socket
  socket.on("error", (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });

  //get available rooms
  socket.on("get-rooms", () => {
    const rooms = roomManager.getRooms();
    socket.emit(
      "rooms-list",
      rooms.map((room) => ({
        id: room.id,
        name: room.name,
        playerCount: room.playerCount,
        maxPlayers: room.maxPlayers,
        isPromise: room.isPrivate,
      }))
    );
  });

  //create a new room
  socket.on("create-room", ({ roomName, maxPlayers, isPrivate = false }) => {
    const room = roomManager.createRoom(
      roomName || `${socket.data.user.username}'s Room`,
      maxPlayers || 5,
      isPrivate
    );

    socket.emit("room-created", {
      id: room.id,
      name: room.name,
      playerCount: room.playerCount,
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
    });

    console.log(`Room created: ${room.id} by ${socket.data.user.username}`);
  });

  //join game in a specific room
  socket.on("join-game", ({ username, roomId }) => {
    // if no roomId , use default room
    const targetRoomId = roomId || defaultRoom.id;
    const room = roomManager.getRoom(targetRoomId);

    if (!room) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    const playerId = uuidv4();

    //create player
    const player: Player = {
      id: playerId,
      userId: socket.data.user.id,
      username: username || socket.data.user.username,
      position: {
        x: Math.random() * (gameSettings.mapWidth - 100) + 50,
        y: Math.random() * (gameSettings.mapHeight - 100) + 50,
      },
      direction: 0,
      health: 100,
      kills: 0,
      lastShotTime: 0,
      score: 0,
      powerups: [],
    };

    //add player to room
    const joined = roomManager.joinRoom(targetRoomId, player);

    if (!joined) {
      socket.emit("error", {
        message: "Failed to join room. Room might by full",
      });
      return;
    }

    //associate socket with playerId and roomId
    socket.data.playerId = playerId;
    socket.data.roomId = targetRoomId;

    //join socket room for game updates
    socket.join(`room:${targetRoomId}`);

    //send inital game state to player
    socket.emit("game-joined", {
      id: playerId,
      roomId: targetRoomId,
      roomName: room.name,
      initalState: room.gameManager.getGameState(),
    });

    console.log(`Player ${username} (${playerId}) joined room ${targetRoomId}`);
  });

  socket.on("player-update", (update: PlayerUpdate) => {
    try {
      const playerId = socket.data.playerId;
      const roomId = socket.data.roomId;

      if (!playerId || !roomId) return;

      if (playerId === update.id) {
        const room = roomManager.getRoom(roomId);
        if (room) {
          room.gameManager.updatePlayer(update);
        }
      }
    } catch (error) {
      console.log("Error in player-update:", error);
    }
  });

  //leave current room
  socket.on("leave-room", () => {
    const playerId = socket.data.playerId;
    const roomId = socket.data.roomId;

    if (playerId && roomId) {
      //leave the socket.io room
      socket.leave(`room:${roomId}`);

      //remove player from game room
      roomManager.leaveRoom(roomId, playerId);

      //clean up socket data
      delete socket.data.playerId;
      delete socket.data.roomId;

      socket.emit("room-left");
      console.log(`Player ${playerId} left room ${roomId}`);
    }
  });

  //Handle disconnect
  socket.on("disconnect", async (reason) => {
    console.log(`Socket ${socket.id} disconnected due to:`, reason);
    const playerId = socket.data.playerId;
    const roomId = socket.data.roomId;

    if (playerId && roomId) {
      console.log(`Player ${playerId} disconnected from room ${roomId}`);

      //get room and player data before removing
      const room = roomManager.getRoom(roomId);
      let player = null;

      if (room) {
        player = room.gameManager.getPlayer(playerId);

        //remove player from room
        roomManager.leaveRoom(roomId, playerId);
      }

      // If player had user ID and had kills, update leaderboard
      if (player && player.userId && player.kills > 0) {
        try {
          await prismaClient.leaderboard.update({
            where: { userId: player.userId },
            data: {
              totalKills: { increment: player.kills },
              matchesPlayed: { increment: 1 },
            },
          });
        } catch (error) {
          console.error("Failed to update leaderboard:", error);
        }
      }
    }
  });
});

setInterval(() => {
  try {
    //get all rooms
    const rooms = roomManager.getRooms(true); //includes private rooms

    //update each room's game state
    rooms.forEach((room) => {
      room.gameManager.update();

      //broadcast game state to all players in this room
      io.to(`room:${room.id}`).emit(
        "game-state-update",
        room.gameManager.getGameState()
      );
    });
  } catch (error) {
    console.error("Error in game update loop:", error);
  }
}, 1000 / 60);

//start server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Websocket game server running on port ${PORT}`);
});

//   // Join game
//   socket.on("join-game", ({ username }) => {
//     const playerId = uuidv4();

//     // Create player
//     const player: any = {
//       id: playerId,
//       userId: socket.data.user.id,
//       username: username || socket.data.user.username,
//       position: {
//         x: Math.random() * (gameSettings.mapWidth - 100) + 50,
//         y: Math.random() * (gameSettings.mapHeight - 100) + 50,
//       },
//       direction: 0,
//       health: 100,
//       kills: 0,
//       lastShotTime: 0,
//       score: 0, // Initialize score
//       powerups: [], // Initialize powerups as an empty array
//     };

//     // Add player to game
//     gameManager.addPlayer(player);

//     // Associate socket with player ID
//     socket.data.playerId = playerId;

//     // Join room for game updates
//     socket.join("game");

//     // Send initial game state to player
//     socket.emit("game-joined", {
//       id: playerId,
//       initialState: gameManager.getGameState(),
//     });

//     console.log(`Player ${username} (${playerId}) joined the game`);
//   });

//   // Handle player updates
//   socket.on("player-update", (update: PlayerUpdate) => {
//     try {
//       const playerId = socket.data.playerId;
//       if (playerId && playerId === update.id) {
//         gameManager.updatePlayer(update);
//       }
//     } catch (error) {
//       console.error("Error in player-update:", error);
//     }
//   });

//   // Handle disconnect
//   socket.on("disconnect", async (reason) => {
//     console.log(`Socket ${socket.id} disconnected due to:`, reason);
//     const playerId = socket.data.playerId;

//     if (playerId) {
//       console.log(`Player ${playerId} disconnected`);

//       // Get player data before removing
//       const player = gameManager.getPlayer(playerId);

//       // Remove player from game
//       gameManager.removePlayer(playerId);

//       // If player had user ID and had kills, update leaderboard
//       if (player && player.userId && player.kills > 0) {
//         try {
//           await prismaClient.leaderboard.update({
//             where: { userId: player.userId },
//             data: {
//               totalKills: { increment: player.kills },
//               matchesPlayed: { increment: 1 },
//             },
//           });
//         } catch (error) {
//           console.error("Failed to update leaderboard:", error);
//         }
//       }
//     }
//   });
// });

// // Game update loop
// setInterval(() => {
//   try {
//     // Update game state
//     gameManager.update();

//     // Broadcast game state to all players
//     io.to("game").emit("game-state-update", gameManager.getGameState());
//   } catch (error) {
//     console.error("Error in game update loop:", error);
//   }
// }, 1000 / 60);

// // Start server
// const PORT = process.env.PORT || 3002;
// server.listen(PORT, () => {
//   console.log(`WebSocket game server running on port ${PORT}`);
// });
