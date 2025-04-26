import { v4 as uuidv4 } from "uuid";
import { GameManager } from "./gameManager";
import { GameSettings } from "@repo/types/types";

interface Room {
  id: string;
  name: string;
  gameManager: GameManager;
  playerCount: number;
  maxPlayers: number;
  createdAt: Date;
  isPrivate: boolean;
}

export class RoomManager {
  private rooms: Map<string, Room>;
  private gameSettings: GameSettings;

  constructor(gameSettings: GameSettings) {
    this.rooms = new Map();
    this.gameSettings = gameSettings;
  }

  createRoom(
    name: string,
    maxPlayers: number = 5,
    isPrivate: boolean = false
  ): Room {
    const roomId = uuidv4().substring(0, 6).toUpperCase();

    //create a new game manager instance for this room
    const gameManager = new GameManager(this.gameSettings);

    //create the room
    const room: Room = {
      id: roomId,
      name: name || `Game Room ${roomId}`,
      gameManager,
      playerCount: 0,
      maxPlayers,
      createdAt: new Date(),
      isPrivate,
    };

    this.rooms.set(roomId, room);

    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRooms(includePrivate: boolean = false): Room[] {
    const rooms: Room[] = [];
    this.rooms.forEach((room) => {
      if (!room.isPrivate || includePrivate) {
        rooms.push(room);
      }
    });
    return rooms;
  }

  joinRoom(roomId: string, player: any): boolean {
    const room = this.rooms.get(roomId);

    if (!room) {
      return false;
    }

    if (room.playerCount >= room.maxPlayers) {
      return false;
    }

    room.gameManager.addPlayer(player);
    room.playerCount++;

    return true;
  }

  leaveRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);

    if (room) {
      room.gameManager.removePlayer(playerId);
      room.playerCount--;

      if (room.playerCount <= 0) {
        setTimeout(() => {
          if (
            this.rooms.has(roomId) &&
            this.rooms.get(roomId)?.playerCount === 0
          ) {
            this.rooms.delete(roomId);
            console.log(`Room ${roomId} removed due to inactivity`);
          }
        }, 60000); //removes after 1 min of being empty
      }
    }
  }

  removeRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }
}
