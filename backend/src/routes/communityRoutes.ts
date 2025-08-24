import { Router } from 'express';
import {
  listCommunities,
  createCommunity,
  getCommunityPlaces,
} from '../controllers/communityController';

const router = Router();

router.get('/', listCommunities);
router.post('/', createCommunity);
router.get('/:id/places', getCommunityPlaces);

export default router;
