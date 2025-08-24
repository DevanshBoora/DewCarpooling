import { Request, Response } from 'express';
import RideTracking, { IRideTracking } from '../models/RideTracking';
import Ride from '../models/Ride';
import { AuthedRequest } from '../middleware/authMiddleware';

// WebSocket server instance (will be set from server.ts)
let io: any;

export const setSocketServer = (socketServer: any) => {
  io = socketServer;
};

// POST /api/ride-tracking/start
export const startRideTracking = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { rideId, currentLocation, estimatedDuration } = req.body as {
      rideId: string;
      currentLocation: { latitude: number; longitude: number };
      estimatedDuration?: number;
    };

    // Validate ride exists and user is the driver
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only the ride owner can start tracking' });
    }

    // Check if tracking already exists
    const existingTracking = await RideTracking.findOne({ ride: rideId });
    if (existingTracking && existingTracking.status !== 'waiting') {
      return res.status(400).json({ 
        message: 'Ride tracking already started',
        status: existingTracking.status 
      });
    }

    // Create or update tracking record
    const trackingData = {
      ride: rideId,
      driver: req.userId,
      passengers: ride.participants,
      status: 'started' as const,
      currentLocation: {
        type: 'Point' as const,
        coordinates: [currentLocation.longitude, currentLocation.latitude]
      },
      locationHistory: [{
        location: {
          type: 'Point' as const,
          coordinates: [currentLocation.longitude, currentLocation.latitude]
        },
        timestamp: new Date()
      }],
      startedAt: new Date(),
      lastLocationUpdate: new Date(),
      estimatedDuration,
      estimatedPickupTime: estimatedDuration ? 
        new Date(Date.now() + estimatedDuration * 60 * 1000) : undefined
    };

    let tracking: IRideTracking;
    if (existingTracking) {
      tracking = await RideTracking.findByIdAndUpdate(
        existingTracking._id,
        trackingData,
        { new: true }
      ) as IRideTracking;
    } else {
      tracking = await RideTracking.create(trackingData);
    }

    // Notify passengers via WebSocket
    if (io) {
      ride.participants.forEach(passengerId => {
        io.to(`user_${passengerId}`).emit('rideStarted', {
          rideId,
          driverLocation: currentLocation,
          estimatedPickupTime: tracking.estimatedPickupTime,
          message: 'Your driver is on the way!'
        });
      });
    }

    return res.json({
      trackingId: tracking._id,
      status: tracking.status,
      message: 'Ride tracking started successfully'
    });

  } catch (error: any) {
    console.error('Start ride tracking error:', error);
    return res.status(500).json({ 
      message: 'Failed to start ride tracking', 
      error: error?.message || String(error) 
    });
  }
};

// POST /api/ride-tracking/:id/location
export const updateLocation = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { id } = req.params;
    const { location, speed, heading } = req.body as {
      location: { latitude: number; longitude: number };
      speed?: number;
      heading?: number;
    };

    const tracking = await RideTracking.findById(id);
    if (!tracking) {
      return res.status(404).json({ message: 'Ride tracking not found' });
    }

    if (tracking.driver.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only the driver can update location' });
    }

    if (tracking.status === 'completed' || tracking.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot update location for completed ride' });
    }

    // Update current location and add to history
    const locationPoint = {
      type: 'Point' as const,
      coordinates: [location.longitude, location.latitude]
    };

    const locationHistoryEntry = {
      location: locationPoint,
      timestamp: new Date(),
      speed,
      heading
    };

    await RideTracking.findByIdAndUpdate(id, {
      currentLocation: locationPoint,
      $push: { locationHistory: locationHistoryEntry },
      lastLocationUpdate: new Date()
    });

    // Check if driver is off route (simplified logic)
    // In production, use proper route matching algorithms
    const isOffRoute = false; // TODO: Implement route deviation detection

    // Emit location update to passengers via WebSocket
    if (io) {
      tracking.passengers.forEach(passengerId => {
        io.to(`user_${passengerId}`).emit('driverLocationUpdate', {
          rideId: tracking.ride,
          location,
          speed,
          heading,
          timestamp: new Date(),
          isOffRoute
        });
      });
    }

    return res.json({
      message: 'Location updated successfully',
      isOffRoute
    });

  } catch (error: any) {
    console.error('Update location error:', error);
    return res.status(500).json({ 
      message: 'Failed to update location', 
      error: error?.message || String(error) 
    });
  }
};

// POST /api/ride-tracking/:id/pickup-complete
export const markPickupComplete = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { id } = req.params;
    const { passengerId } = req.body as { passengerId?: string };

    const tracking = await RideTracking.findById(id);
    if (!tracking) {
      return res.status(404).json({ message: 'Ride tracking not found' });
    }

    if (tracking.driver.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only the driver can mark pickup complete' });
    }

    await RideTracking.findByIdAndUpdate(id, {
      status: 'in_progress',
      pickupCompletedAt: new Date()
    });

    // Notify all participants
    if (io) {
      tracking.passengers.forEach(pid => {
        io.to(`user_${pid}`).emit('pickupCompleted', {
          rideId: tracking.ride,
          passengerId,
          timestamp: new Date(),
          message: 'Pickup completed. Ride is now in progress.'
        });
      });
    }

    return res.json({
      message: 'Pickup marked as complete',
      status: 'in_progress'
    });

  } catch (error: any) {
    console.error('Mark pickup complete error:', error);
    return res.status(500).json({ 
      message: 'Failed to mark pickup complete', 
      error: error?.message || String(error) 
    });
  }
};

// POST /api/ride-tracking/:id/complete
export const completeRide = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { id } = req.params;
    const { finalLocation } = req.body as {
      finalLocation?: { latitude: number; longitude: number };
    };

    const tracking = await RideTracking.findById(id);
    if (!tracking) {
      return res.status(404).json({ message: 'Ride tracking not found' });
    }

    if (tracking.driver.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only the driver can complete the ride' });
    }

    const updateData: any = {
      status: 'completed',
      completedAt: new Date(),
      dropoffCompletedAt: new Date()
    };

    if (finalLocation) {
      updateData.currentLocation = {
        type: 'Point',
        coordinates: [finalLocation.longitude, finalLocation.latitude]
      };
    }

    await RideTracking.findByIdAndUpdate(id, updateData);

    // Update the main ride status
    await Ride.findByIdAndUpdate(tracking.ride, { status: 'completed' });

    // Notify all participants
    if (io) {
      tracking.passengers.forEach(passengerId => {
        io.to(`user_${passengerId}`).emit('rideCompleted', {
          rideId: tracking.ride,
          completedAt: new Date(),
          message: 'Ride completed successfully!'
        });
      });
    }

    return res.json({
      message: 'Ride completed successfully',
      status: 'completed'
    });

  } catch (error: any) {
    console.error('Complete ride error:', error);
    return res.status(500).json({ 
      message: 'Failed to complete ride', 
      error: error?.message || String(error) 
    });
  }
};

// GET /api/ride-tracking/:id
export const getRideTracking = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { id } = req.params;

    const tracking = await RideTracking.findById(id)
      .populate('ride', 'pickupLocation dropoffLocation departureTime')
      .populate('driver', 'name avatar phone')
      .populate('passengers', 'name avatar phone');

    if (!tracking) {
      return res.status(404).json({ message: 'Ride tracking not found' });
    }

    // Check if user is authorized to view this tracking
    const isDriver = (tracking.driver as any)._id.toString() === req.userId;
    const isPassenger = tracking.passengers.some((p: any) => p._id.toString() === req.userId);

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ message: 'Not authorized to view this ride tracking' });
    }

    return res.json(tracking);

  } catch (error: any) {
    console.error('Get ride tracking error:', error);
    return res.status(500).json({ 
      message: 'Failed to get ride tracking', 
      error: error?.message || String(error) 
    });
  }
};

// GET /api/ride-tracking/active
export const getActiveRides = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const activeRides = await RideTracking.find({
      $or: [
        { driver: req.userId },
        { passengers: req.userId }
      ],
      status: { $in: ['waiting', 'started', 'in_progress'] }
    })
    .populate('ride', 'pickupLocation dropoffLocation departureTime')
    .populate('driver', 'name avatar phone')
    .populate('passengers', 'name avatar phone')
    .sort({ startedAt: -1 });

    return res.json(activeRides);

  } catch (error: any) {
    console.error('Get active rides error:', error);
    return res.status(500).json({ 
      message: 'Failed to get active rides', 
      error: error?.message || String(error) 
    });
  }
};

// POST /api/ride-tracking/:id/emergency
export const triggerRideEmergency = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { id } = req.params;
    const { type, location } = req.body as {
      type: string;
      location: { latitude: number; longitude: number };
    };

    const tracking = await RideTracking.findById(id);
    if (!tracking) {
      return res.status(404).json({ message: 'Ride tracking not found' });
    }

    // Check if user is part of this ride
    const isDriver = tracking.driver.toString() === req.userId;
    const isPassenger = tracking.passengers.some(p => p.toString() === req.userId);

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ message: 'Not authorized for this ride' });
    }

    // Update tracking with emergency details
    await RideTracking.findByIdAndUpdate(id, {
      status: 'emergency',
      emergencyTriggered: true,
      emergencyDetails: {
        triggeredBy: req.userId,
        type,
        location: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        },
        timestamp: new Date()
      }
    });

    // Notify all participants and emergency contacts
    if (io) {
      const allParticipants = [tracking.driver, ...tracking.passengers];
      allParticipants.forEach(participantId => {
        if (participantId.toString() !== req.userId) {
          io.to(`user_${participantId}`).emit('rideEmergency', {
            rideId: tracking.ride,
            type,
            location,
            triggeredBy: req.userId,
            timestamp: new Date(),
            message: 'Emergency alert triggered for this ride!'
          });
        }
      });
    }

    return res.json({
      message: 'Emergency alert triggered for ride',
      status: 'emergency'
    });

  } catch (error: any) {
    console.error('Trigger ride emergency error:', error);
    return res.status(500).json({ 
      message: 'Failed to trigger ride emergency', 
      error: error?.message || String(error) 
    });
  }
};
