import { Router } from 'express';
import { uploadFile, streamFile } from '../controllers/fileController';

const router = Router();

// Public streaming route
router.get('/:id', streamFile);

// Upload route (optionally protect later)
router.post('/', uploadFile);

export default router;
