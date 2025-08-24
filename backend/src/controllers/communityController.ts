import { Request, Response } from 'express';
import Community from '../models/Community';

// GET /api/communities - List/search communities
export const listCommunities = async (req: Request, res: Response) => {
  try {
    const communities = await Community.find({});
    res.json(communities);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// POST /api/communities - Create new community
export const createCommunity = async (req: Request, res: Response) => {
  try {
    const newCommunity = new Community(req.body);
    await newCommunity.save();
    res.status(201).json(newCommunity);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// GET /api/communities/:id/places - Get places/locations for selected community
export const getCommunityPlaces = async (req: Request, res: Response) => {
  try {
    const community = await Community.findById(req.params.id).populate('places');
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    res.json(community.places);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
