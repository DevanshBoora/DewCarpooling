import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';

let bucket: GridFSBucket | null = null;

export const initFileBucket = () => {
  const db = mongoose.connection.db;
  if (!db) return;
  bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
};

// POST /api/files - upload base64 or data URL image
export const uploadFile = async (req: Request, res: Response) => {
  try {
    const { data, filename, contentType } = req.body as { data: string; filename?: string; contentType?: string };
    if (!data) return res.status(400).json({ message: 'Missing data' });

    // Accept data URL or base64 string
    let mime = contentType || 'image/jpeg';
    let base64 = data;
    const dataUrlMatch = /^data:(.+);base64,(.*)$/.exec(data);
    if (dataUrlMatch) {
      const m = dataUrlMatch[1];
      if (m) mime = m;
      base64 = dataUrlMatch[2] || '';
    }
    const buffer = Buffer.from(base64, 'base64');

    if (!bucket) initFileBucket();
    if (!bucket) return res.status(500).json({ message: 'File bucket not initialized' });

    const uploadStream = bucket.openUploadStream(filename || `upload_${Date.now()}`, { contentType: mime });
    uploadStream.end(buffer, () => {
      return res.status(201).json({ fileId: uploadStream.id });
    });
  } catch (e: any) {
    return res.status(500).json({ message: 'Upload failed', error: String(e?.message || e) });
  }
};

// GET /api/files/:id - stream file (public)
export const streamFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!bucket) initFileBucket();
    if (!bucket) return res.status(500).json({ message: 'File bucket not initialized' });

    const _id = new ObjectId(id);

    // Probe file to get contentType
    const files = await bucket.find({ _id }).toArray();
    if (!files || files.length === 0) return res.status(404).json({ message: 'File not found' });
    const file = files[0] as any;
    if (file?.contentType) res.setHeader('Content-Type', file.contentType);

    const readStream = bucket.openDownloadStream(_id);
    readStream.on('error', () => res.status(404).end());
    readStream.pipe(res);
  } catch (e) {
    return res.status(400).json({ message: 'Invalid file id' });
  }
};
