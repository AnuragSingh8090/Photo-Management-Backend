import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { getMediaDataPath } from './pathHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use memory storage - we'll save the file manually to the record folder
const storage = multer.memoryStorage();

// File filter to accept images AND videos
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|webm|mov|avi|quicktime|x-msvideo/;
  
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mimetype = file.mimetype.toLowerCase();
  
  const isImage = allowedImageTypes.test(ext) || allowedImageTypes.test(mimetype);
  const isVideo = allowedVideoTypes.test(ext) || mimetype.startsWith('video/');
  
  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) and video files (mp4, webm, mov, avi) are allowed'));
  }
};

// Configure multer for multiple files (up to 20)
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit (for videos)
  }
});

// Save a media file buffer to a record's folder
export const saveMediaToFolder = (recordId, fileBuffer, originalName) => {
  const dataDir = getMediaDataPath();
  const folderPath = path.join(dataDir, recordId);
  
  // Ensure folder exists
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  const ext = path.extname(originalName).toLowerCase();
  const mediaFileName = `${recordId}${ext}`;
  const mediaPath = path.join(folderPath, mediaFileName);
  
  fs.writeFileSync(mediaPath, fileBuffer);
  
  return mediaFileName;
};

// Delete old media files from a record folder
export const deleteOldMedia = (recordId) => {
  const dataDir = getMediaDataPath();
  const folderPath = path.join(dataDir, recordId);
  
  if (!fs.existsSync(folderPath)) return;
  
  const mediaExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov', '.avi'];
  const files = fs.readdirSync(folderPath);
  
  files.forEach(file => {
    if (mediaExts.includes(path.extname(file).toLowerCase())) {
      fs.unlinkSync(path.join(folderPath, file));
    }
  });
};
