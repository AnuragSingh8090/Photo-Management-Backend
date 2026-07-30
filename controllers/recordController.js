import * as recordService from '../services/recordService.js';
import { deleteFile } from '../utils/fileUpload.js';

// Create a new record
export const createRecord = async (req, res) => {
  try {
    const { title, description, dateTime } = req.body;
    
    if (!title || !dateTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and dateTime are required' 
      });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    const recordData = {
      title,
      description: description || '',
      dateTime,
      imageUrl
    };

    const newRecord = recordService.createRecord(recordData);
    
    res.status(201).json({ 
      success: true, 
      message: 'Record created successfully', 
      data: newRecord 
    });
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create record', 
      error: error.message 
    });
  }
};

// Get all records
export const getAllRecords = async (req, res) => {
  try {
    const records = recordService.getAllRecords();
    res.status(200).json({ 
      success: true, 
      data: records 
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch records', 
      error: error.message 
    });
  }
};

// Get a single record by ID
export const getRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = recordService.getRecordById(id);
    
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        message: 'Record not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      data: record 
    });
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch record', 
      error: error.message 
    });
  }
};

// Update a record
export const updateRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dateTime } = req.body;
    
    const existingRecord = recordService.getRecordById(id);
    if (!existingRecord) {
      return res.status(404).json({ 
        success: false, 
        message: 'Record not found' 
      });
    }

    const updateData = {
      title: title || existingRecord.title,
      description: description !== undefined ? description : existingRecord.description,
      dateTime: dateTime || existingRecord.dateTime
    };

    // Handle image update
    if (req.file) {
      // Delete old image if exists
      if (existingRecord.imageUrl) {
        const oldFilename = existingRecord.imageUrl.split('/').pop();
        deleteFile(oldFilename);
      }
      updateData.imageUrl = `/uploads/${req.file.filename}`;
    } else {
      updateData.imageUrl = existingRecord.imageUrl;
    }

    const updatedRecord = recordService.updateRecord(id, updateData);
    
    res.status(200).json({ 
      success: true, 
      message: 'Record updated successfully', 
      data: updatedRecord 
    });
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update record', 
      error: error.message 
    });
  }
};

// Delete a record
export const deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    
    const record = recordService.getRecordById(id);
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        message: 'Record not found' 
      });
    }

    // Delete associated image file
    if (record.imageUrl) {
      const filename = record.imageUrl.split('/').pop();
      deleteFile(filename);
    }

    recordService.deleteRecord(id);
    
    res.status(200).json({ 
      success: true, 
      message: 'Record deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete record', 
      error: error.message 
    });
  }
};
