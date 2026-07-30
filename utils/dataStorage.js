import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');

// Ensure main data directory exists
export const ensureDataDirectory = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Sanitize string for valid directory/file names on Windows and Linux
export const sanitizeFileName = (name) => {
  if (!name) return 'Untitled';
  // Replace illegal filename chars \ / : * ? " < > | with hyphen
  return name.replace(/[\\/:*?"<>|]/g, '-').trim();
};

// Format ISO/Date string into readable YYYY-MM-DD - HH-MM AM/PM for filenames
export const formatDateTimeForFileName = (dateTimeStr) => {
  try {
    const cleanStr = dateTimeStr ? dateTimeStr.replace('Z', '') : '';
    const dateObj = cleanStr ? new Date(cleanStr) : new Date();
    
    if (isNaN(dateObj.getTime())) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} - ${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    }

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedHours = String(hours).padStart(2, '0');

    return `${year}-${month}-${day} - ${formattedHours}-${minutes} ${period}`;
  } catch (e) {
    return 'date-unknown';
  }
};

// Generate a clean base name for folder and files: "Title - Date - Time - Id"
export const generateBaseName = (title, dateTimeStr, id) => {
  const cleanTitle = sanitizeFileName(title || 'Record');
  const cleanDateTime = formatDateTimeForFileName(dateTimeStr);
  const shortId = id ? id.split('-')[0] : Math.random().toString(36).substring(2, 8);
  return `${cleanTitle} - ${cleanDateTime} - ${shortId}`;
};

// Find folder info by record ID
export const findRecordFolderById = (id) => {
  ensureDataDirectory();
  const entries = fs.readdirSync(dataDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const folderName = entry.name;
      const folderPath = path.join(dataDir, folderName);
      
      // Look for any .json file in this folder
      const files = fs.readdirSync(folderPath);
      const jsonFile = files.find(f => f.endsWith('.json'));

      if (jsonFile) {
        try {
          const jsonContent = fs.readFileSync(path.join(folderPath, jsonFile), 'utf8');
          const record = JSON.parse(jsonContent);
          if (record && record.id === id) {
            return {
              folderName,
              folderPath,
              jsonFile,
              record
            };
          }
        } catch (e) {
          // ignore invalid json files
        }
      }
    }
  }
  return null;
};

// Create a record folder using baseName
export const createRecordFolder = (baseName) => {
  ensureDataDirectory();
  const folderPath = path.join(dataDir, baseName);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  return folderPath;
};

// Save record JSON inside its folder
export const saveRecordJson = (folderName, baseName, recordData) => {
  const folderPath = path.join(dataDir, folderName);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  const jsonPath = path.join(folderPath, `${baseName}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(recordData, null, 2), 'utf8');
};

// Read all records from all subdirectories in /data/
export const readAllRecords = () => {
  ensureDataDirectory();
  const records = [];
  const entries = fs.readdirSync(dataDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const folderName = entry.name;
      const folderPath = path.join(dataDir, folderName);
      const files = fs.readdirSync(folderPath);
      const jsonFile = files.find(f => f.endsWith('.json'));

      if (jsonFile) {
        try {
          const content = fs.readFileSync(path.join(folderPath, jsonFile), 'utf8');
          const record = JSON.parse(content);
          if (record) {
            record.folderName = folderName;
            records.push(record);
          }
        } catch (e) {
          console.error(`Error reading JSON in ${folderName}:`, e);
        }
      }
    }
  }
  return records;
};

// Read single record by ID
export const readRecordJson = (id) => {
  const result = findRecordFolderById(id);
  return result ? result.record : null;
};

// Delete record folder completely
export const deleteRecordFolder = (id) => {
  const result = findRecordFolderById(id);
  if (result && fs.existsSync(result.folderPath)) {
    fs.rmSync(result.folderPath, { recursive: true, force: true });
    return true;
  }
  return false;
};

// Save image file buffer to record folder
export const saveImageToRecordFolder = (folderName, baseName, buffer, originalName) => {
  const folderPath = path.join(dataDir, folderName);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const imageFileName = `${baseName}${ext}`;
  const imagePath = path.join(folderPath, imageFileName);

  fs.writeFileSync(imagePath, buffer);
  return imageFileName;
};

// Delete any image in record folder
export const deleteImagesInFolder = (folderPath) => {
  if (!fs.existsSync(folderPath)) return;
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const files = fs.readdirSync(folderPath);

  files.forEach(file => {
    if (imageExts.includes(path.extname(file).toLowerCase())) {
      try {
        fs.unlinkSync(path.join(folderPath, file));
      } catch (e) {
        console.error('Error unlinking image file:', e);
      }
    }
  });
};
