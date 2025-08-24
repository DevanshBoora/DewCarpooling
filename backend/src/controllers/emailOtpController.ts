import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import Community from '../models/Community';
import jwt from 'jsonwebtoken';

// Simple in-memory store for OTPs. Replace with Redis or DB for production.
const store = new Map<string, { code: string; expiresAt: number; attempts: number }>();

const generate6Digit = () => Math.floor(100000 + Math.random() * 900000).toString();
const now = () => Date.now();

const generateToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'a_default_secret_key_for_dev', { expiresIn: '30d' });

// POST /api/auth/email-otp/send
export const sendEmailOtp = async (req: Request, res: Response) => {
  try {
    const emailRaw = String((req.body?.email || '') as string).trim().toLowerCase();
    if (!emailRaw || !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(emailRaw)) {
      return res.status(422).json({ message: 'Validation failed', errors: { email: 'Email is invalid' } });
    }

    // Basic rate limit: allow one active OTP per email, refresh after expiry or explicit resend
    const code = generate6Digit();
    store.set(emailRaw, { code, expiresAt: now() + 5 * 60 * 1000, attempts: 0 });

    // TODO: Integrate real email provider (Resend/SendGrid/Nodemailer SMTP) here.
    // For development convenience, include the OTP in response when not production.
    const devPayload = process.env.NODE_ENV === 'production' ? {} : { devOtp: code };

    return res.json({ message: 'OTP sent to email if configured', ...devPayload });
  } catch (err: any) {
    return res.status(500).json({ message: 'Server Error', error: err?.message || String(err) });
  }
};

// POST /api/auth/email-otp/verify
export const verifyEmailOtp = async (req: Request, res: Response) => {
  try {
    const email = String((req.body?.email || '') as string).trim().toLowerCase();
    const code = String((req.body?.code || '') as string).trim();
    if (!email || !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(email)) {
      return res.status(422).json({ message: 'Validation failed', errors: { email: 'Email is invalid' } });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(422).json({ message: 'Validation failed', errors: { code: 'Code must be 6 digits' } });
    }

    const entry = store.get(email);
    if (!entry || entry.expiresAt < now()) {
      store.delete(email);
      return res.status(400).json({ message: 'OTP expired or not requested' });
    }
    if (entry.attempts >= 5) {
      store.delete(email);
      return res.status(429).json({ message: 'Too many attempts. Please request a new code.' });
    }
    entry.attempts += 1;

    if (entry.code !== code) {
      return res.status(401).json({ message: 'Invalid code' });
    }

    // Consume the OTP
    store.delete(email);

    // Find or create user by email
    let user = await User.findOne({ email });
    let isNew = false;
    if (!user) {
      user = await User.create({
        email,
        name: '',
        isProfileComplete: false,
        avatar: '',
      } as Partial<IUser> as IUser);
      isNew = true;
      // Attempt to auto-assign a community for new users
      try {
        let communityId: string | null = null;
        const envDefault = (process.env.DEFAULT_COMMUNITY_ID || '').trim();
        if (envDefault) {
          const found = await Community.findById(envDefault).select('_id');
          if (found) {
            communityId = String(found._id);
          }
        }
        if (!communityId) {
          // Pick the most recently created community (by _id timestamp)
          const latest = await Community.findOne({}).sort({ _id: -1 }).select('_id');
          if (latest) {
            communityId = String(latest._id);
          }
        }
        if (communityId) {
          await User.findByIdAndUpdate(user._id, { community: communityId });
          // Best-effort: add user to community.members
          await Community.findByIdAndUpdate(communityId, { $addToSet: { members: user._id } });
          // Update local instance to reflect community assignment without re-fetch
          (user as any).community = communityId;
        }
      } catch (e) {
        // Non-fatal: signup should still succeed even if community assignment fails
        console.warn('[emailOtp.verify] auto-assign community failed:', (e as Error)?.message);
      }
    }

    // Guard: ensure user exists (should always be true due to create above)
    if (!user) {
      return res.status(500).json({ message: 'User creation failed' });
    }

    const token = generateToken(user.id);
    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token,
      isNew,
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Server Error', error: err?.message || String(err) });
  }
};
