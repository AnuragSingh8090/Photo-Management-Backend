import express from 'express';
import {
  createRecord,
  getAllRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
  deleteMultipleRecords,
  addMedia,
  deleteMedia
} from '../controllers/recordController.js';
import { upload } from '../utils/fileUpload.js';

const router = express.Router();

// Delete multiple records (must be before POST '/' to avoid route conflict)
router.post('/delete-multiple', deleteMultipleRecords);

// Create a new record with multiple media files
router.post('/', upload.array('media', 20), createRecord);

// Get all records
router.get('/', getAllRecords);

// Get a single record by ID
router.get('/:id', getRecordById);

// Update a record (text fields only)
router.put('/:id', updateRecord);

// Add a single media file to an existing record
router.post('/:id/media', upload.single('media'), addMedia);

// Delete a specific media file from a record
router.delete('/:id/media/:fileName', deleteMedia);

// Delete a record
router.delete('/:id', deleteRecord);

export default router;
