import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedRequest extends Request {
  userId?: string;
}

export const protect = (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const header = req.headers['authorization'] || req.headers['Authorization'];
    if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    const token = header.substring('Bearer '.length);
    const secret = process.env.JWT_SECRET || 'a_default_secret_key_for_dev';
    const payload = jwt.verify(token, secret) as { id: string; iat: number; exp: number };
    req.userId = payload.id;
    next();
  } catch (e: any) {
    return res.status(401).json({ message: 'Not authorized', error: e?.message });
  }
};
