import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use memory storage - we'll save the file manually to the record folder
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure multer with memory storage
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Save an image buffer to a record's folder
export const saveImageToFolder = (recordId, fileBuffer, originalName) => {
  const dataDir = path.join(__dirname, '../data');
  const folderPath = path.join(dataDir, recordId);
  
  // Ensure folder exists
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  const ext = path.extname(originalName).toLowerCase();
  const imageFileName = `${recordId}${ext}`;
  const imagePath = path.join(folderPath, imageFileName);
  
  fs.writeFileSync(imagePath, fileBuffer);
  
  return imageFileName;
};

// Delete old image(s) from a record folder (before saving a new one)
export const deleteOldImage = (recordId) => {
  const dataDir = path.join(__dirname, '../data');
  const folderPath = path.join(dataDir, recordId);
  
  if (!fs.existsSync(folderPath)) return;
  
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const files = fs.readdirSync(folderPath);
  
  files.forEach(file => {
    if (imageExts.includes(path.extname(file).toLowerCase())) {
      fs.unlinkSync(path.join(folderPath, file));
    }
  });
};
