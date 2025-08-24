import { Router } from 'express';
import { registerUser, loginUser, changePassword, firebaseLogin } from '../controllers/authController';
import { sendEmailOtp, verifyEmailOtp } from '../controllers/emailOtpController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/firebase-login', firebaseLogin);
router.post('/email-otp/send', sendEmailOtp);
router.post('/email-otp/verify', verifyEmailOtp);
router.post('/change-password', protect, changePassword);

export default router;
