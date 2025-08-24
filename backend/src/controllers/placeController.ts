import { Request, Response } from 'express';
import Place from '../models/Place';

// GET /api/places?community=:id - List/search places for community
export const listPlaces = async (req: Request, res: Response) => {
  const { community } = req.query;
  if (!community) {
    return res.status(400).json({ message: 'Community ID is required' });
  }

  try {
    const places = await Place.find({ community });
    res.json(places);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
