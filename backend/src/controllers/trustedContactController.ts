import { Request, Response } from 'express';
import TrustedContact, { ITrustedContact } from '../models/TrustedContact';
import { AuthedRequest } from '../middleware/authMiddleware';

// Generate random 6-digit verification code
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /api/trusted-contacts
export const addTrustedContact = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { name, phone, email, relationship, isPrimary } = req.body as {
      name: string;
      phone: string;
      email?: string;
      relationship: 'family' | 'friend' | 'colleague' | 'emergency_contact';
      isPrimary?: boolean;
    };

    // Validation
    const errors: Record<string, string> = {};
    if (!name?.trim()) errors.name = 'Name is required';
    if (!phone?.match(/^\+[1-9]\d{1,14}$/)) errors.phone = 'Valid phone number in E.164 format required';
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.email = 'Valid email required';
    if (!relationship) errors.relationship = 'Relationship is required';

    if (Object.keys(errors).length) {
      return res.status(422).json({ message: 'Validation failed', errors });
    }

    // Check if phone already exists for this user
    const existingContact = await TrustedContact.findOne({ user: req.userId, phone });
    if (existingContact) {
      return res.status(409).json({ 
        message: 'Contact with this phone number already exists',
        errors: { phone: 'already_exists' }
      });
    }

    // If setting as primary, unset other primary contacts
    if (isPrimary) {
      await TrustedContact.updateMany(
        { user: req.userId, isPrimary: true },
        { isPrimary: false }
      );
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const contact = await TrustedContact.create({
      user: req.userId,
      name: name.trim(),
      phone,
      email: email?.toLowerCase().trim(),
      relationship,
      isPrimary: isPrimary || false,
      isVerified: false,
      verificationCode,
      verificationExpiry
    });

    // TODO: Send verification SMS
    console.log(`[TRUSTED_CONTACT] Verification code for ${phone}: ${verificationCode}`);
    // await sendSMS(phone, `Your Dew verification code is: ${verificationCode}`);

    return res.status(201).json({
      _id: contact._id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      relationship: contact.relationship,
      isPrimary: contact.isPrimary,
      isVerified: contact.isVerified,
      message: 'Trusted contact added. Verification code sent via SMS.'
    });

  } catch (error: any) {
    console.error('Add trusted contact error:', error);
    return res.status(500).json({ 
      message: 'Failed to add trusted contact', 
      error: error?.message || String(error) 
    });
  }
};

// POST /api/trusted-contacts/:id/verify
export const verifyTrustedContact = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { id } = req.params;
    const { code } = req.body as { code: string };

    if (!code?.match(/^\d{6}$/)) {
      return res.status(422).json({ 
        message: 'Validation failed',
        errors: { code: 'Valid 6-digit code required' }
      });
    }

    const contact = await TrustedContact.findOne({ _id: id, user: req.userId });
    if (!contact) {
      return res.status(404).json({ message: 'Trusted contact not found' });
    }

    if (contact.isVerified) {
      return res.status(400).json({ message: 'Contact is already verified' });
    }

    if (!contact.verificationCode || !contact.verificationExpiry) {
      return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
    }

    if (contact.verificationExpiry < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    if (contact.verificationCode !== code) {
      return res.status(401).json({ message: 'Invalid verification code' });
    }

    // Verify the contact
    await TrustedContact.findByIdAndUpdate(id, {
      isVerified: true,
      verificationCode: undefined,
      verificationExpiry: undefined
    });

    return res.json({
      message: 'Trusted contact verified successfully',
      isVerified: true
    });

  } catch (error: any) {
    console.error('Verify trusted contact error:', error);
    return res.status(500).json({ 
      message: 'Failed to verify trusted contact', 
      error: error?.message || String(error) 
    });
  }
};

// GET /api/trusted-contacts
export const getTrustedContacts = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const contacts = await TrustedContact.find({ user: req.userId })
      .select('-verificationCode')
      .sort({ isPrimary: -1, createdAt: -1 });

    return res.json(contacts);

  } catch (error: any) {
    console.error('Get trusted contacts error:', error);
    return res.status(500).json({ 
      message: 'Failed to get trusted contacts', 
      error: error?.message || String(error) 
    });
  }
};

// DELETE /api/trusted-contacts/:id
export const deleteTrustedContact = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { id } = req.params;

    const contact = await TrustedContact.findOneAndDelete({ _id: id, user: req.userId });
    if (!contact) {
      return res.status(404).json({ message: 'Trusted contact not found' });
    }

    return res.json({ message: 'Trusted contact deleted successfully' });

  } catch (error: any) {
    console.error('Delete trusted contact error:', error);
    return res.status(500).json({ 
      message: 'Failed to delete trusted contact', 
      error: error?.message || String(error) 
    });
  }
};

// POST /api/trusted-contacts/:id/resend-verification
export const resendVerification = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { id } = req.params;

    const contact = await TrustedContact.findOne({ _id: id, user: req.userId });
    if (!contact) {
      return res.status(404).json({ message: 'Trusted contact not found' });
    }

    if (contact.isVerified) {
      return res.status(400).json({ message: 'Contact is already verified' });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await TrustedContact.findByIdAndUpdate(id, {
      verificationCode,
      verificationExpiry
    });

    // TODO: Send verification SMS
    console.log(`[TRUSTED_CONTACT] New verification code for ${contact.phone}: ${verificationCode}`);
    // await sendSMS(contact.phone, `Your Dew verification code is: ${verificationCode}`);

    return res.json({
      message: 'Verification code sent successfully'
    });

  } catch (error: any) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ 
      message: 'Failed to resend verification code', 
      error: error?.message || String(error) 
    });
  }
};
