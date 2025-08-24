import { Router } from 'express';
import { 
  startRideTracking, 
  updateLocation, 
  markPickupComplete, 
  completeRide,
  getRideTracking,
  getActiveRides,
  triggerRideEmergency
} from '../controllers/rideTrackingController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All ride tracking routes require authentication
router.use(protect);

router.post('/start', startRideTracking);
router.get('/active', getActiveRides);
router.get('/:id', getRideTracking);
router.post('/:id/location', updateLocation);
router.post('/:id/pickup-complete', markPickupComplete);
router.post('/:id/complete', completeRide);
router.post('/:id/emergency', triggerRideEmergency);

export default router;
