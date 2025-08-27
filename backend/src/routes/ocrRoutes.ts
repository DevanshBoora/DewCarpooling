import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { ocrUpload, ocrLicense } from '../controllers/ocrController';

const router = Router();

// POST /api/ocr/license - Multipart form-data with field 'image'
router.post('/license', protect, ocrUpload.single('image'), ocrLicense);

export default router;
