import { Request, Response } from 'express';
import Incident, { IIncident } from '../models/Incident';
import { AuthedRequest } from '../middleware/authMiddleware';

// POST /api/incidents
export const submitIncidentReport = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { type, description, severity, rideId, reportedUserId } = req.body as {
      type: 'safety' | 'harassment' | 'vehicle' | 'payment' | 'other';
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      rideId?: string;
      reportedUserId?: string;
    };

    // Validation
    if (!type || !description || !severity) {
      return res.status(400).json({ message: 'Type, description, and severity are required' });
    }

    if (description.trim().length < 10) {
      return res.status(400).json({ message: 'Description must be at least 10 characters' });
    }

    if (description.length > 2000) {
      return res.status(400).json({ message: 'Description cannot exceed 2000 characters' });
    }

    const validTypes = ['safety', 'harassment', 'vehicle', 'payment', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid incident type' });
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({ message: 'Invalid severity level' });
    }

    // Create incident report
    const incident = new Incident({
      type,
      description: description.trim(),
      severity,
      reporterId: req.userId,
      rideId: rideId || undefined,
      reportedUserId: reportedUserId || undefined,
    });

    await incident.save();

    // Populate reporter info for response
    await incident.populate('reporterId', 'name email');

    // TODO: Send notification to admin/safety team
    console.log(`New ${severity} incident report submitted:`, {
      id: incident._id,
      type,
      reporterId: req.userId,
    });

    return res.status(201).json(incident);

  } catch (error: any) {
    console.error('Submit incident report error:', error);
    return res.status(500).json({ message: 'Failed to submit incident report' });
  }
};

// GET /api/incidents/my-reports
export const getMyIncidentReports = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const skip = (page - 1) * limit;

    const incidents = await Incident.find({ reporterId: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('rideId', 'pickupLocation dropoffLocation departureTime')
      .populate('reportedUserId', 'name avatar')
      .select('-adminNotes -resolvedBy'); // Hide admin-only fields

    const total = await Incident.countDocuments({ reporterId: req.userId });

    return res.json({
      incidents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error: any) {
    console.error('Get my incident reports error:', error);
    return res.status(500).json({ message: 'Failed to get incident reports' });
  }
};

// GET /api/incidents/:id
export const getIncidentReport = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { id } = req.params;

    const incident = await Incident.findById(id)
      .populate('reporterId', 'name avatar email')
      .populate('rideId', 'pickupLocation dropoffLocation departureTime')
      .populate('reportedUserId', 'name avatar');

    if (!incident) {
      return res.status(404).json({ message: 'Incident report not found' });
    }

    // Check if user is authorized to view this incident
    const isReporter = incident.reporterId._id.toString() === req.userId;
    const isReported = incident.reportedUserId && incident.reportedUserId._id.toString() === req.userId;

    if (!isReporter && !isReported) {
      return res.status(403).json({ message: 'Not authorized to view this incident report' });
    }

    // Hide admin-only fields from regular users
    const response = incident.toObject();
    // TODO: Add admin check when user model includes isAdmin field
    // if (!req.user?.isAdmin) {
      delete response.adminNotes;
      delete response.resolvedBy;
    // }

    return res.json(response);

  } catch (error: any) {
    console.error('Get incident report error:', error);
    return res.status(500).json({ message: 'Failed to get incident report' });
  }
};

// Admin endpoints (would require admin middleware in production)

// GET /api/incidents/admin/all
export const getAllIncidentReports = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    // TODO: Add admin authorization check
    // if (!req.user?.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const skip = (page - 1) * limit;

    const status = req.query.status as string;
    const severity = req.query.severity as string;
    const type = req.query.type as string;

    const filter: any = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;

    const incidents = await Incident.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reporterId', 'name avatar email')
      .populate('rideId', 'pickupLocation dropoffLocation departureTime')
      .populate('reportedUserId', 'name avatar')
      .populate('resolvedBy', 'name');

    const total = await Incident.countDocuments(filter);

    return res.json({
      incidents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error: any) {
    console.error('Get all incident reports error:', error);
    return res.status(500).json({ message: 'Failed to get incident reports' });
  }
};

// PUT /api/incidents/admin/:id/status
export const updateIncidentStatus = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    // TODO: Add admin authorization check
    // if (!req.user?.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    const { id } = req.params;
    const { status, adminNotes } = req.body as {
      status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
      adminNotes?: string;
    };

    const validStatuses = ['pending', 'investigating', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident report not found' });
    }

    incident.status = status;
    if (adminNotes) incident.adminNotes = adminNotes.trim();
    if (status === 'resolved') {
      incident.resolvedBy = req.userId as any;
      incident.resolvedAt = new Date();
    }

    await incident.save();

    await incident.populate([
      { path: 'reporterId', select: 'name avatar email' },
      { path: 'rideId', select: 'pickupLocation dropoffLocation departureTime' },
      { path: 'reportedUserId', select: 'name avatar' },
      { path: 'resolvedBy', select: 'name' },
    ]);

    return res.json(incident);

  } catch (error: any) {
    console.error('Update incident status error:', error);
    return res.status(500).json({ message: 'Failed to update incident status' });
  }
};
