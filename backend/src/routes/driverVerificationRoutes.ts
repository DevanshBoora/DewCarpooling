import { Router } from 'express';
import { 
  submitDriverVerification, 
  getVerificationStatus, 
  resubmitVerification,
  approveVerification,
  rejectVerification
} from '../controllers/driverVerificationController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All driver verification routes require authentication
router.use(protect);

router.post('/submit', submitDriverVerification);
router.get('/status', getVerificationStatus);
router.post('/resubmit', resubmitVerification);

// Admin routes (would need admin middleware in production)
router.post('/:id/approve', approveVerification);
router.post('/:id/reject', rejectVerification);

export default router;
