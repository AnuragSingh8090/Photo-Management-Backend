import { v4 as uuidv4 } from 'uuid';
import {
  generateBaseName,
  createRecordFolder,
  saveRecordJson,
  readRecordJson,
  readAllRecords,
  deleteRecordFolder,
  findRecordFolderById,
  saveImageToRecordFolder,
  deleteImagesInFolder
} from '../utils/dataStorage.js';

// Create a new record
export const createRecord = (recordData, imageFileObj) => {
  const id = uuidv4();
  const baseName = generateBaseName(recordData.title, recordData.dateTime, id);
  const folderName = baseName;

  // Create folder
  createRecordFolder(folderName);

  let imageFileName = null;
  if (imageFileObj && imageFileObj.buffer) {
    imageFileName = saveImageToRecordFolder(
      folderName,
      baseName,
      imageFileObj.buffer,
      imageFileObj.originalname
    );
  }

  const newRecord = {
    id,
    folderName,
    title: recordData.title,
    description: recordData.description || '',
    dateTime: recordData.dateTime,
    imageFile: imageFileName,
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

// Update a record
export const updateRecord = (id, updateData, newImageFileObj) => {
  const folderInfo = findRecordFolderById(id);

  if (!folderInfo) {
    return null;
  }

  const existingRecord = folderInfo.record;
  const currentFolderName = folderInfo.folderName;

  // Compute new baseName if title or dateTime changed
  const newTitle = updateData.title || existingRecord.title;
  const newDateTime = updateData.dateTime || existingRecord.dateTime;
  const newBaseName = generateBaseName(newTitle, newDateTime, id);
  const newFolderName = newBaseName;

  // Build lastUpdate object
  const changedFields = {};
  if (updateData.title && updateData.title !== existingRecord.title) {
    changedFields.title = { from: existingRecord.title, to: updateData.title };
  }
  if (updateData.dateTime && updateData.dateTime !== existingRecord.dateTime) {
    changedFields.dateTime = { from: existingRecord.dateTime, to: updateData.dateTime };
  }
  if (newImageFileObj) {
    changedFields.imageFile = { from: existingRecord.imageFile, to: newImageFileObj.originalname };
  }

  let finalImageFileName = existingRecord.imageFile;

  if (newImageFileObj && newImageFileObj.buffer) {
    // Delete existing images in current folder
    deleteImagesInFolder(folderInfo.folderPath);

    // Save new image
    finalImageFileName = saveImageToRecordFolder(
      currentFolderName,
      newBaseName,
      newImageFileObj.buffer,
      newImageFileObj.originalname
    );
  }

  const updatedRecord = {
    ...existingRecord,
    folderName: newFolderName,
    title: newTitle,
    description: updateData.description !== undefined ? updateData.description : existingRecord.description,
    dateTime: newDateTime,
    imageFile: finalImageFileName,
    updatedAt: new Date().toISOString(),
    lastUpdate: {
      timestamp: new Date().toISOString(),
      changedFields
    }
  };

  // Re-save JSON with new baseName
  saveRecordJson(currentFolderName, newBaseName, updatedRecord);

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
