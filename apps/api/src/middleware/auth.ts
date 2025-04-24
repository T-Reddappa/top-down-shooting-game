import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prismaClient } from "@repo/db";

interface JwtPayload {
  id: string;
  username: string;
}

const jwtSecret = process.env.JWT_SECRET || "secret";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token: string = authHeader.split(" ")[1]!;

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as unknown as JwtPayload;

    // Check if user exists
    const user = await prismaClient.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Add user to request object
    req.user = {
      id: user.id,
      username: user.username,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
