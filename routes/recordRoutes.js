import express from 'express';
import {
  createRecord,
  getAllRecords,
  getRecordById,
  updateRecord,
  deleteRecord
} from '../controllers/recordController.js';
import { upload } from '../utils/fileUpload.js';

const router = express.Router();

// Create a new record with image
router.post('/', upload.single('image'), createRecord);

// Get all records
router.get('/', getAllRecords);

// Get a single record by ID
router.get('/:id', getRecordById);

// Update a record
router.put('/:id', upload.single('image'), updateRecord);

// Delete a record
router.delete('/:id', deleteRecord);

export default router;
