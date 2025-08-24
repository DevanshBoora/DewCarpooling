import { Router } from 'express';
import {
  listRides,
  createRide,
  getRideDetails,
  updateRide,
  joinRide,
} from '../controllers/rideController';

const router = Router();

router.get('/', listRides);
router.post('/', createRide);
router.get('/:id', getRideDetails);
router.put('/:id', updateRide);
router.post('/:id/join', joinRide);

export default router;
