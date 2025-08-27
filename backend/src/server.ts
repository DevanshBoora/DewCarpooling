import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import morgan from 'morgan';
import { 
  securityHeaders, 
  httpsRedirect, 
  corsOptions, 
  sanitizeInput, 
  requestLogger,
  apiRateLimit,
  authRateLimit,
  usersMeRateLimit 
} from './middleware/securityMiddleware';

import userRoutes from './routes/userRoutes';
import communityRoutes from './routes/communityRoutes';
import placeRoutes from './routes/placeRoutes';
import rideRoutes from './routes/rideRoutes';
import authRoutes from './routes/authRoutes';
import fileRoutes from './routes/fileRoutes';
import emergencyRoutes from './routes/emergencyRoutes';
import trustedContactRoutes from './routes/trustedContactRoutes';
import driverVerificationRoutes from './routes/driverVerificationRoutes';
import rideTrackingRoutes from './routes/rideTrackingRoutes';
import incidentRoutes from './routes/incidentRoutes';
import ocrRoutes from './routes/ocrRoutes';
import { initFileBucket } from './controllers/fileController';
import { setSocketServer } from './controllers/rideTrackingController';

// Ensure we load the env file from the backend directory regardless of cwd
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5001;
const ORIGIN = process.env.CORS_ORIGIN || '*';

// Initialize WebSocket server for ride tracking
setSocketServer(io);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-ride', (rideId: string) => {
    socket.join(`ride-${rideId}`);
    console.log(`Client ${socket.id} joined ride ${rideId}`);
  });

  socket.on('leave-ride', (rideId: string) => {
    socket.leave(`ride-${rideId}`);
    console.log(`Client ${socket.id} left ride ${rideId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Security Middleware
app.use(httpsRedirect);
app.use(securityHeaders);
app.use(requestLogger);
app.use(sanitizeInput);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors(corsOptions));
// Increase body size limits to handle base64 avatar payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
// Apply a higher/specialized limit for identity polling first
app.use('/api/users/me', usersMeRateLimit);
// Then apply general API and auth-specific limits
app.use('/api/', apiRateLimit);
app.use('/api/auth/', authRateLimit);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/places', placeRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/trusted-contacts', trustedContactRoutes);
app.use('/api/driver-verification', driverVerificationRoutes);
app.use('/api/ride-tracking', rideTrackingRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/ocr', ocrRoutes);

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dewcarpooling';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // initialize GridFS bucket
    initFileBucket();
    // Ensure users.email index is sparse unique to avoid duplicates on null
    (async () => {
      try {
        const users = mongoose.connection.collection('users');
        const indexes = await users.indexes();
        const emailIdx = indexes.find((i: any) => i.name === 'email_1');
        if (emailIdx && emailIdx.unique && !emailIdx.sparse) {
          console.warn('Dropping non-sparse unique index email_1 to recreate as sparse unique');
          await users.dropIndex('email_1');
        }
        // Create sparse unique index if missing or dropped
        const refreshed = await users.indexes();
        const hasSparse = refreshed.find((i: any) => i.name === 'email_1' && i.unique && i.sparse);
        if (!hasSparse) {
          await users.createIndex({ email: 1 }, { unique: true, sparse: true, name: 'email_1' });
          console.log('Created sparse unique index on users.email');
        }
      } catch (e) {
        console.warn('Index maintenance for users.email failed:', (e as Error).message);
      }
    })();
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`WebSocket server initialized`);
    });
  })
  .catch((error) => {
    console.error('Connection error', error.message);
  });
