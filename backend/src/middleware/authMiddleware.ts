import { Request, Response, NextFunction } from 'express';

// authorization 

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;


  if (req.path.startsWith('/auth') || req.path === '/health') {
    return next();
  }


  next();
}
