import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createWorker } from 'tesseract.js';

// Multer setup: store files in memory or tmp dir; we use disk for simplicity
const uploadDir = path.resolve(__dirname, '../../tmp');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req: Request, _file: any, cb: (error: any, destination: string) => void) => cb(null, uploadDir),
  filename: (_req: Request, file: any, cb: (error: any, filename: string) => void) => {
    const ext = path.extname(file.originalname || '.jpg');
    cb(null, `ocr_${Date.now()}${ext || '.jpg'}`);
  },
});

export const ocrUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req: Request, file: any, cb: (error: any, acceptFile?: boolean) => void) => {
    const isImage = typeof file.mimetype === 'string' && file.mimetype.startsWith('image/');
    if (!isImage) return cb(new Error('Only image uploads are allowed'));
    cb(null, true);
  },
});

export const ocrLicense = async (req: Request, res: Response) => {
  // Expect single file 'image'
  const file = (req as any).file as any | undefined;
  if (!file) {
    return res.status(400).json({ error: 'Image file is required (field name: image)' });
  }

  const worker = await createWorker();

  try {
    await worker.reinitialize('eng');

    // Some tuning for ID cards
    await worker.setParameters({
      tessedit_pageseg_mode: '6', // Assume a uniform block of text
      preserve_interword_spaces: '1',
    } as any);

    const { data } = await worker.recognize(file.path);
    const rawText = data.text || '';

    // Basic sanitation: collapse multiple spaces
    const cleaned = rawText.replace(/[\t\r]+/g, '').replace(/ +/g, ' ').trim();

    // Return raw text; client can parse or we can parse here (optional)
    res.json({ text: cleaned });
  } catch (e: any) {
    res.status(500).json({ error: 'OCR failed', details: e?.message || String(e) });
  } finally {
    try { await worker.terminate(); } catch {}
    // Cleanup tmp file
    try { fs.unlinkSync(file.path); } catch {}
  }
};
