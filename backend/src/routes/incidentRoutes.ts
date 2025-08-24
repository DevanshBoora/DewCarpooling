import { Router } from 'express';
import { 
  submitIncidentReport,
  getMyIncidentReports,
  getIncidentReport,
  getAllIncidentReports,
  updateIncidentStatus
} from '../controllers/incidentController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// All incident routes require authentication
router.use(protect);

// User routes
router.post('/', submitIncidentReport);
router.get('/my-reports', getMyIncidentReports);
router.get('/:id', getIncidentReport);

// Admin routes (would require admin middleware in production)
router.get('/admin/all', getAllIncidentReports);
router.put('/admin/:id/status', updateIncidentStatus);

export default router;
