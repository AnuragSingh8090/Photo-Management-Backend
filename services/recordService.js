import { v4 as uuidv4 } from 'uuid';
import { readData, writeData } from '../utils/dataStorage.js';

// Create a new record
export const createRecord = (recordData) => {
  const records = readData();
  
  const newRecord = {
    id: uuidv4(),
    ...recordData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  records.push(newRecord);
  writeData(records);
  
  return newRecord;
};

// Get all records
export const getAllRecords = () => {
  const records = readData();
  // Sort by dateTime in descending order (newest first)
  return records.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
};

// Get a record by ID
export const getRecordById = (id) => {
  const records = readData();
  return records.find(record => record.id === id);
};

// Update a record
export const updateRecord = (id, updateData) => {
  const records = readData();
  const index = records.findIndex(record => record.id === id);
  
  if (index === -1) {
    return null;
  }
  
  records[index] = {
    ...records[index],
    ...updateData,
    updatedAt: new Date().toISOString()
  };
  
  writeData(records);
  return records[index];
};

// Delete a record
export const deleteRecord = (id) => {
  const records = readData();
  const filteredRecords = records.filter(record => record.id !== id);
  
  if (records.length === filteredRecords.length) {
    return false;
  }
  
  writeData(filteredRecords);
  return true;
};
