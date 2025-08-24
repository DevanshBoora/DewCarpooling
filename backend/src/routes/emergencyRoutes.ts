import { Router } from 'express';
import { 
  triggerSOS, 
  resolveEmergency, 
  getEmergencyHistory, 
  getActiveEmergencies 
} from '../controllers/emergencyController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All emergency routes require authentication
router.use(protect);

router.post('/sos', triggerSOS);
router.post('/resolve', resolveEmergency);
router.get('/history', getEmergencyHistory);
router.get('/active', getActiveEmergencies);

export default router;
