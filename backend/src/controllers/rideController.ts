import { Request, Response } from 'express';
import Ride from '../models/Ride';

// GET /api/rides?community=:id - List all rides in community
export const listRides = async (req: Request, res: Response) => {
  const { community } = req.query;
  if (!community) {
    return res.status(400).json({ message: 'Community ID is required' });
  }

  try {
    const rides = await Ride.find({ community })
      .populate('owner', 'name avatar rating')
      .populate('pickupLocation')
      .populate('dropoffLocation');
    res.json(rides);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// POST /api/rides - Create ride
export const createRide = async (req: Request, res: Response) => {
  try {
    const newRide = new Ride(req.body);
    await newRide.save();
    res.status(201).json(newRide);
  } catch (error: any) {
    // Provide clearer feedback for validation issues
    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation failed',
        error: error?.message,
        fields: error?.errors ? Object.keys(error.errors) : [],
      });
    }
    if (error?.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid data', error: String(error?.message || error) });
    }
    res.status(500).json({ message: 'Server error', error: String(error?.message || error) });
  }
};

// GET /api/rides/:id - Fetch ride details
export const getRideDetails = async (req: Request, res: Response) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('owner', 'name avatar rating')
      .populate('participants', 'name avatar')
      .populate('pickupLocation')
      .populate('dropoffLocation');

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    res.json(ride);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// PUT /api/rides/:id - Update/cancel ride
export const updateRide = async (req: Request, res: Response) => {
  try {
    const ride = await Ride.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }
    res.json(ride);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// POST /api/rides/:id/join - Add user as participant
export const joinRide = async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Add user to participants if not already in the list
    if (!ride.participants.includes(userId)) {
      ride.participants.push(userId);
      await ride.save();
    }

    res.json(ride);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
