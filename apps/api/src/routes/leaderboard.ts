import express from "express";
import { authenticate } from "../middleware/auth";
import { PlayerStats } from "@repo/types/types";
import { prismaClient } from "@repo/db";

const router = express.Router();

// Get top players
router.get("/top", async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const leaderboard = await prismaClient.leaderboard.findMany({
      take: limit,
      orderBy: {
        totalScore: "desc",
      },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    const topPlayers: PlayerStats[] = leaderboard.map((entry: any) => ({
      username: entry.user.username,
      totalKills: entry.totalKills,
      totalDeaths: entry.totalDeaths,
      totalScore: entry.totalScore,
      matchesPlayed: entry.matchesPlayed,
    }));

    res.json(topPlayers);
  } catch (error) {
    next(error);
  }
});

// Get current player stats
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const leaderboard = await prismaClient.leaderboard.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!leaderboard) {
      return res.status(404).json({ message: "Stats not found" });
    }

    const playerStats: PlayerStats = {
      username: leaderboard.user.username,
      totalKills: leaderboard.totalKills,
      totalDeaths: leaderboard.totalDeaths,
      totalScore: leaderboard.totalScore,
      matchesPlayed: leaderboard.matchesPlayed,
    };

    res.json(playerStats);
  } catch (error) {
    next(error);
  }
});

export default router;
