import { v4 as uuidv4 } from 'uuid';
import {
  generateBaseName,
  createRecordFolder,
  saveRecordJson,
  readRecordJson,
  readAllRecords,
  deleteRecordFolder,
  findRecordFolderById,
  saveMediaToRecordFolder,
  deleteMediaFileFromFolder,
  getMediaType
} from '../utils/dataStorage.js';

// Create a new record with multiple media files
export const createRecord = (recordData, mediaFileObjects) => {
  const id = uuidv4();
  const baseName = generateBaseName(recordData.title, recordData.dateTime, id);
  const folderName = baseName;

  // Create folder
  createRecordFolder(folderName);

  const mediaFiles = [];
  if (mediaFileObjects && Array.isArray(mediaFileObjects) && mediaFileObjects.length > 0) {
    mediaFileObjects.forEach((fileObj, index) => {
      if (fileObj && fileObj.buffer) {
        const savedFileName = saveMediaToRecordFolder(
          folderName,
          baseName,
          fileObj.buffer,
          fileObj.originalname,
          index
        );
        mediaFiles.push({
          fileName: savedFileName,
          type: getMediaType(savedFileName),
          originalName: fileObj.originalname
        });
      }
    });
  }

  const newRecord = {
    id,
    folderName,
    title: recordData.title,
    description: recordData.description || '',
    dateTime: recordData.dateTime,
    mediaFiles,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveRecordJson(folderName, baseName, newRecord);

  return newRecord;
};

// Get all records
export const getAllRecords = () => {
  const records = readAllRecords();
  return records.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
};

// Get a record by ID
export const getRecordById = (id) => {
  return readRecordJson(id);
};

// Update a record (text fields only, no media changes)
export const updateRecord = (id, updateData) => {
  const folderInfo = findRecordFolderById(id);

  if (!folderInfo) {
    return null;
  }

  const existingRecord = folderInfo.record;
  const currentFolderName = folderInfo.folderName;
  const currentBaseName = folderInfo.jsonFile.replace('.json', '');

  const newTitle = updateData.title || existingRecord.title;
  const newDateTime = updateData.dateTime || existingRecord.dateTime;

  // Preserve mediaFiles (with migration for old records)
  let mediaFiles = existingRecord.mediaFiles || [];
  if (!mediaFiles.length && existingRecord.imageFile) {
    mediaFiles = [{
      fileName: existingRecord.imageFile,
      type: getMediaType(existingRecord.imageFile),
      originalName: existingRecord.imageFile
    }];
  }

  const updatedRecord = {
    ...existingRecord,
    // keep original folderName to avoid breaking media paths
    title: newTitle,
    description: updateData.description !== undefined ? updateData.description : existingRecord.description,
    dateTime: newDateTime,
    mediaFiles,
    updatedAt: new Date().toISOString()
  };

  saveRecordJson(currentFolderName, currentBaseName, updatedRecord);

  return updatedRecord;
};

// Add a single media file to an existing record
export const addMediaToRecord = (id, fileObj) => {
  const folderInfo = findRecordFolderById(id);
  if (!folderInfo) return null;

  const record = folderInfo.record;
  const folderName = folderInfo.folderName;
  const baseName = generateBaseName(record.title, record.dateTime, id);

  // Migrate old format if needed
  let mediaFiles = record.mediaFiles || [];
  if (!mediaFiles.length && record.imageFile) {
    mediaFiles = [{
      fileName: record.imageFile,
      type: getMediaType(record.imageFile),
      originalName: record.imageFile
    }];
  }

  // Save the new file with a unique index
  const newIndex = Date.now();
  const savedFileName = saveMediaToRecordFolder(
    folderName,
    baseName,
    fileObj.buffer,
    fileObj.originalname,
    newIndex
  );

  mediaFiles.push({
    fileName: savedFileName,
    type: getMediaType(savedFileName),
    originalName: fileObj.originalname
  });

  const updatedRecord = {
    ...record,
    mediaFiles,
    updatedAt: new Date().toISOString()
  };

  saveRecordJson(folderName, baseName, updatedRecord);
  return updatedRecord;
};

// Delete a single media file from a record
export const deleteMediaFromRecord = (id, fileName) => {
  const folderInfo = findRecordFolderById(id);
  if (!folderInfo) return null;

  const record = folderInfo.record;
  const folderName = folderInfo.folderName;
  const baseName = generateBaseName(record.title, record.dateTime, id);

  // Migrate old format if needed
  let mediaFiles = record.mediaFiles || [];
  if (!mediaFiles.length && record.imageFile) {
    mediaFiles = [{
      fileName: record.imageFile,
      type: getMediaType(record.imageFile),
      originalName: record.imageFile
    }];
  }

  // Delete the physical file
  deleteMediaFileFromFolder(folderInfo.folderPath, fileName);

  // Remove from mediaFiles array
  mediaFiles = mediaFiles.filter(mf => mf.fileName !== fileName);

  const updatedRecord = {
    ...record,
    mediaFiles,
    updatedAt: new Date().toISOString()
  };

  saveRecordJson(folderName, baseName, updatedRecord);
  return updatedRecord;
};

// Delete a record
export const deleteRecord = (id) => {
  return deleteRecordFolder(id);
};

// Delete multiple records
export const deleteMultipleRecords = (ids) => {
  const deletedRecords = [];
  ids.forEach(id => {
    const record = readRecordJson(id);
    if (record) {
      deletedRecords.push(record);
      deleteRecordFolder(id);
    }
  });
  return deletedRecords;
};
