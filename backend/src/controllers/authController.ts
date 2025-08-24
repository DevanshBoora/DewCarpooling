import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { AuthedRequest } from '../middleware/authMiddleware';
import { verifyIdToken } from '../firebaseAdmin';

// Helper to generate JWT
const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'a_default_secret_key_for_dev', {
    expiresIn: '30d',
  });
};

// @desc    Login or register using Firebase ID token (Phone Auth)
// @route   POST /api/auth/firebase-login
// @access  Public
export const firebaseLogin = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) return res.status(400).json({ message: 'Missing idToken' });

    const decoded = await verifyIdToken(idToken);
    const phone = decoded.phone_number; // E.164 format
    const name = decoded.name || '';
    if (!phone) return res.status(400).json({ message: 'Phone number not present in token' });

    let user = await User.findOne({ phone });
    let isNew = false;
    if (!user) {
      user = await User.create({
        name, // allow empty, will be completed in setup
        phone,
        isPhoneVerified: true,
        isProfileComplete: false,
        avatar: '', // force profile setup to collect photo
      } as Partial<IUser> as IUser);
      isNew = true;
    } else {
      let changed = false;
      if (!user.isPhoneVerified) {
        user.isPhoneVerified = true;
        changed = true;
      }
      // If profile data is incomplete, ensure flag is false to trigger setup on client
      if (!user.name || !user.avatar) {
        // backfill missing fields as empty strings if undefined
        if (!user.name) user.name = '' as any;
        if (!user.avatar) user.avatar = '' as any;
        if (user.isProfileComplete) user.isProfileComplete = false as any;
        changed = true;
      }
      if (changed) await user.save();
    }

    return res.json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      token: generateToken(user.id),
      isNew,
    });
  } catch (error: any) {
    console.error('firebaseLogin verifyIdToken error:', error);
    return res.status(401).json({ message: 'Invalid Firebase token', error: error?.message || String(error) });
  }
};

// @desc    Change password for authenticated user
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

    const errs: Record<string, string> = {};
    if (!currentPassword) errs.currentPassword = 'Current password is required';
    if (!newPassword) errs.newPassword = 'New password is required';
    else if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(String(newPassword))) {
      errs.newPassword = 'Password must be at least 8 characters and include letters and numbers';
    }
    if (Object.keys(errs).length) return res.status(422).json({ message: 'Validation failed', errors: errs });

    // Load user with password for comparison
    const user = await User.findById(req.userId).select('+password');
    if (!user || !user.password) return res.status(404).json({ message: 'User not found' });

    const ok = await (user as any).comparePassword(currentPassword as string);
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect', errors: { currentPassword: 'incorrect' } });

    // Assign and save to trigger pre-save hashing
    (user as any).password = newPassword;
    await user.save();
    return res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server Error', error: error?.message || String(error) });
  }
};

// Basic validators
const isEmail = (email: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
const normalizeEmail = (email: string) => String(email || '').trim().toLowerCase();
const normalizeName = (name: string) => String(name || '').trim();
const isStrongPassword = (pwd: string) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(String(pwd || ''));

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  let { name, email, password } = req.body as { name?: string; email?: string; password?: string };
  name = normalizeName(name as string);
  email = normalizeEmail(email as string);

  // Input validation
  const errors: Record<string, string> = {};
  if (!name || name.length < 2) errors.name = 'Name must be at least 2 characters';
  if (!email || !isEmail(email)) errors.email = 'Email is invalid';
  if (!password) {
    errors.password = 'Password is required';
  } else if (!isStrongPassword(password)) {
    errors.password = 'Password must be at least 8 characters and include letters and numbers';
  }
  if (Object.keys(errors).length) {
    return res.status(422).json({ message: 'Validation failed', errors });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: 'Email already in use', errors: { email: 'already_exists' } });
    }

    // The 'pre-save' hook in User.ts will hash the password
    const user: IUser = await User.create({
      name,
      email,
      password,
      avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}` // Default avatar
    });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user.id),
    });
  } catch (error: any) {
    // Handle duplicate key error from Mongo just in case
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({ message: 'Email already in use', errors: { email: 'already_exists' } });
    }
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
  const raw = req.body as { email?: string; password?: string };
  const email = normalizeEmail(raw.email as string);
  const password = String(raw.password || '');

  // Input validation
  const errors: Record<string, string> = {};
  if (!email || !isEmail(email)) errors.email = 'Email is invalid';
  if (!password) errors.password = 'Password is required';
  if (Object.keys(errors).length) {
    return res.status(422).json({ message: 'Validation failed', errors });
  }

  try {
    // We need to explicitly select the password field as it's hidden by default
    const user: IUser | null = await User.findOne({ email }).select('+password');

    if (user && user.password && (await user.comparePassword(password))) {
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user.id),
      });
    }
    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
