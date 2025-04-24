import { Request, Response, NextFunction } from "express";

interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;

  console.error(`[${new Date().toISOString()}] ${err.stack}`);

  res.status(statusCode).json({
    error: {
      message: err.message,
      status: statusCode,
      timestamp: new Date().toISOString(),
    },
  });
};
