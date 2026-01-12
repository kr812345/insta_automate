import { Request, Response, NextFunction } from 'express';

export interface AppErrorInterface {
  statusCode?: number;
  status?: string;
  message: string;
  stack?: string;
}

export const errorHandler = (
  err: AppErrorInterface | Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const statusCode = (err as AppErrorInterface).statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error('Error:', {
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export class AppError extends Error implements AppErrorInterface {
  statusCode: number;
  status: string;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

