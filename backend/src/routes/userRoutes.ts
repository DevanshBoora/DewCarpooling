import { Router } from 'express';
import { listUsers, getUserProfile, updateUserProfile, getMe } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/', listUsers);

// Place '/me' BEFORE '/:id' so it doesn't get captured by the dynamic route
router.get('/me', protect, getMe);

router.get('/:id', getUserProfile);
router.put('/:id', protect, updateUserProfile);

export default router;
