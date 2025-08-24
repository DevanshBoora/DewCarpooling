import { Request, Response } from 'express';
import Emergency, { IEmergency } from '../models/Emergency';
import TrustedContact from '../models/TrustedContact';
import User from '../models/User';
import { AuthedRequest } from '../middleware/authMiddleware';

// POST /api/emergency/sos
export const triggerSOS = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { 
      type = 'sos', 
      location, 
      address, 
      message, 
      rideId 
    } = req.body as {
      type?: 'sos' | 'panic' | 'medical' | 'accident' | 'harassment';
      location: { latitude: number; longitude: number };
      address?: string;
      message?: string;
      rideId?: string;
    };

    // Validate location
    if (!location?.latitude || !location?.longitude) {
      return res.status(422).json({ 
        message: 'Location is required for emergency alerts',
        errors: { location: 'GPS coordinates required' }
      });
    }

    // Create emergency record
    const emergency = await Emergency.create({
      user: req.userId,
      ride: rideId || undefined,
      type,
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      },
      address,
      message,
      trustedContactsNotified: false,
      emergencyServicesNotified: false
    });

    // Get user and trusted contacts
    const user = await User.findById(req.userId);
    const trustedContacts = await TrustedContact.find({ 
      user: req.userId, 
      isVerified: true 
    }).sort({ isPrimary: -1 });

    // TODO: Implement actual SMS/call notifications
    // For now, we'll simulate the notification process
    const notificationPromises = trustedContacts.map(async (contact) => {
      // Simulate SMS notification
      console.log(`[EMERGENCY] Notifying ${contact.name} at ${contact.phone}`);
      console.log(`Emergency Alert: ${user?.name} has triggered a ${type.toUpperCase()} alert at ${address || 'unknown location'}. Location: ${location.latitude}, ${location.longitude}`);
      
      // TODO: Integrate with Twilio/SMS service
      // await sendSMS(contact.phone, emergencyMessage);
      
      return { contact: contact.name, status: 'sent' };
    });

    const notificationResults = await Promise.allSettled(notificationPromises);
    
    // Update emergency record
    await Emergency.findByIdAndUpdate(emergency._id, {
      trustedContactsNotified: trustedContacts.length > 0,
      responseTime: new Date()
    });

    // TODO: For high-severity emergencies, notify emergency services
    if (type === 'medical' || type === 'accident') {
      console.log(`[EMERGENCY] High-severity ${type} alert - consider emergency services notification`);
      // await notifyEmergencyServices(location, user, emergency);
    }

    return res.json({
      emergencyId: emergency._id,
      message: 'Emergency alert triggered successfully',
      trustedContactsNotified: trustedContacts.length,
      location: { latitude: location.latitude, longitude: location.longitude },
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('Emergency SOS error:', error);
    return res.status(500).json({ 
      message: 'Failed to trigger emergency alert', 
      error: error?.message || String(error) 
    });
  }
};

// POST /api/emergency/resolve
export const resolveEmergency = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { emergencyId, status = 'resolved', notes } = req.body as {
      emergencyId: string;
      status?: 'resolved' | 'false_alarm';
      notes?: string;
    };

    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) {
      return res.status(404).json({ message: 'Emergency not found' });
    }

    // Only the user who triggered it or admin can resolve
    if (emergency.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to resolve this emergency' });
    }

    if (emergency.status !== 'active') {
      return res.status(400).json({ message: 'Emergency is already resolved' });
    }

    await Emergency.findByIdAndUpdate(emergencyId, {
      status,
      resolvedAt: new Date(),
      resolvedBy: req.userId,
      notes
    });

    // TODO: Notify trusted contacts that emergency is resolved
    const trustedContacts = await TrustedContact.find({ 
      user: req.userId, 
      isVerified: true 
    });

    trustedContacts.forEach(contact => {
      console.log(`[EMERGENCY] Notifying ${contact.name} that emergency is resolved`);
      // TODO: Send resolution SMS
    });

    return res.json({
      message: 'Emergency resolved successfully',
      status,
      resolvedAt: new Date()
    });

  } catch (error: any) {
    console.error('Resolve emergency error:', error);
    return res.status(500).json({ 
      message: 'Failed to resolve emergency', 
      error: error?.message || String(error) 
    });
  }
};

// GET /api/emergency/history
export const getEmergencyHistory = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const emergencies = await Emergency.find({ user: req.userId })
      .populate('ride', 'pickupLocation dropoffLocation departureTime')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json(emergencies);

  } catch (error: any) {
    console.error('Get emergency history error:', error);
    return res.status(500).json({ 
      message: 'Failed to get emergency history', 
      error: error?.message || String(error) 
    });
  }
};

// GET /api/emergency/active
export const getActiveEmergencies = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const activeEmergencies = await Emergency.find({ 
      user: req.userId, 
      status: 'active' 
    })
    .populate('ride', 'pickupLocation dropoffLocation departureTime')
    .sort({ createdAt: -1 });

    return res.json(activeEmergencies);

  } catch (error: any) {
    console.error('Get active emergencies error:', error);
    return res.status(500).json({ 
      message: 'Failed to get active emergencies', 
      error: error?.message || String(error) 
    });
  }
};
