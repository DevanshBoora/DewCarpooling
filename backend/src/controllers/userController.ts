import { Request, Response } from 'express';
import User from '../models/User';
import { AuthedRequest } from '../middleware/authMiddleware';

// GET /api/users - List users (optional ?name= to filter)
export const listUsers = async (req: Request, res: Response) => {
  try {
    const { name } = req.query as { name?: string };
    const query: any = {};
    if (name) {
      // case-insensitive partial match
      query.name = { $regex: new RegExp(String(name), 'i') };
    }
    const users = await User.find(query).limit(50);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// GET /api/users/:id - Fetch user profile data
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).populate('community');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// PUT /api/users/:id - Update user profile or switch community
export const updateUserProfile = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (String(req.userId) !== String(req.params.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { name, email, avatar, community } = req.body as { name?: string; email?: string; avatar?: string; community?: string };
    console.log('[updateUserProfile] incoming body:', {
      name: typeof name === 'string' ? name : typeof name,
      avatarLen: typeof avatar === 'string' ? avatar.length : undefined,
      emailPresent: typeof email === 'string',
    });
    const update: any = {};
    if (typeof name === 'string' && name.trim()) update.name = name.trim();
    // Email is immutable via this endpoint; ignore if provided
    if (typeof email === 'string') {
      // no-op: do not include email in update
    }
    if (typeof avatar === 'string' && avatar.trim()) update.avatar = avatar.trim();
    // Allow switching/setting community explicitly via this endpoint
    if (typeof community === 'string' && community.trim()) update.community = community.trim();

    // Perform update first
    console.log('[updateUserProfile] update payload:', Object.keys(update));
    let user = await User.findByIdAndUpdate(
      req.params.id,
      Object.keys(update).length ? update : {},
      { new: true, runValidators: true, context: 'query' }
    );
    // Mark profile complete when name exists; avatar is optional
    if (user && typeof user.name === 'string' && user.name.trim() && !user.isProfileComplete) {
      user.isProfileComplete = true as any;
      await user.save();
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user);
  } catch (error: any) {
    console.error('[updateUserProfile] error:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      keyPattern: error?.keyPattern,
      errors: error?.errors ? Object.keys(error.errors) : undefined,
    });
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({ message: 'Email already in use', errors: { email: 'Email already in use' } });
    }
    if (error?.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation failed', error: error?.message, fields: error?.errors ? Object.keys(error.errors) : [] });
    }
    return res.status(500).json({ message: 'Server error', error: String(error?.message || error) });
  }
};

// GET /api/users/me - Return current authenticated user
export const getMe = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const user = await User.findById(req.userId).populate('community');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
