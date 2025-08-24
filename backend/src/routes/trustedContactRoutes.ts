import { Router } from 'express';
import { 
  addTrustedContact, 
  verifyTrustedContact, 
  getTrustedContacts, 
  deleteTrustedContact,
  resendVerification
} from '../controllers/trustedContactController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All trusted contact routes require authentication
router.use(protect);

router.post('/', addTrustedContact);
router.get('/', getTrustedContacts);
router.post('/:id/verify', verifyTrustedContact);
router.post('/:id/resend-verification', resendVerification);
router.delete('/:id', deleteTrustedContact);

export default router;
