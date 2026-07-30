import * as recordService from '../services/recordService.js';

// Helper to construct image URL
const getRecordImageUrl = (record) => {
  if (!record || !record.folderName || !record.imageFile) return null;
  return `/data/${encodeURIComponent(record.folderName)}/${encodeURIComponent(record.imageFile)}`;
};

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

    const recordData = {
      title,
      description: description || '',
      dateTime
    };

    const newRecord = recordService.createRecord(recordData, req.file || null);
    
    const recordWithUrl = {
      ...newRecord,
      imageUrl: getRecordImageUrl(newRecord)
    };

    res.status(201).json({ 
      success: true, 
      message: 'Record created successfully', 
      data: recordWithUrl 
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
    
    const recordsWithUrls = records.map(record => ({
      ...record,
      imageUrl: getRecordImageUrl(record)
    }));
    
    res.status(200).json({ 
      success: true, 
      data: recordsWithUrls 
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
    
    const recordWithUrl = {
      ...record,
      imageUrl: getRecordImageUrl(record)
    };
    
    res.status(200).json({ 
      success: true, 
      data: recordWithUrl 
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

    const updatedRecord = recordService.updateRecord(id, updateData, req.file || null);
    
    const recordWithUrl = {
      ...updatedRecord,
      imageUrl: getRecordImageUrl(updatedRecord)
    };
    
    res.status(200).json({ 
      success: true, 
      message: 'Record updated successfully', 
      data: recordWithUrl 
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

// Delete multiple records
export const deleteMultipleRecords = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'IDs array is required and must not be empty' 
      });
    }

    const deletedRecords = recordService.deleteMultipleRecords(ids);
    
    res.status(200).json({ 
      success: true, 
      message: `${deletedRecords.length} record(s) deleted successfully`,
      deletedCount: deletedRecords.length
    });
  } catch (error) {
    console.error('Error deleting multiple records:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete records', 
      error: error.message 
    });
  }
};
