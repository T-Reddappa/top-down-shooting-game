import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { User, AuthResponse } from "@repo/types/types";
import { prismaClient } from "@repo/db";

const router = express.Router();

// Register a new user
router.post("/register", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // Check if username already exists
    const existingUser = await prismaClient.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(409).json({ message: "Username already taken" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prismaClient.user.create({
      data: {
        username,
        passwordHash,
        leaderboard: {
          create: {}, // Create empty leaderboard entry
        },
      },
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // Find user
    const user = await prismaClient.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    console.log(process.env.JWT_SECRET, "jwt");
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "7d" }
    );

    // Return user and token
    const response: AuthResponse = {
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      },
      token,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
