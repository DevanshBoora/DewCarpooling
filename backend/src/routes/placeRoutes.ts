import { Router } from 'express';
import { listPlaces } from '../controllers/placeController';

const router = Router();

router.get('/', listPlaces);

export default router;
