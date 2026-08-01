import * as recordService from '../services/recordService.js';

// Helper to construct media URLs for a record
const getRecordMediaUrls = (record) => {
  if (!record || !record.folderName) return [];
  
  const mediaFiles = record.mediaFiles || [];
  return mediaFiles.map(mf => ({
    url: `/data/${encodeURIComponent(record.folderName)}/${encodeURIComponent(mf.fileName)}`,
    type: mf.type,
    fileName: mf.fileName,
    originalName: mf.originalName
  }));
};

// Create a new record with multiple media files
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

    // req.files is an array when using upload.array()
    const newRecord = recordService.createRecord(recordData, req.files || []);
    
    const recordWithUrls = {
      ...newRecord,
      mediaUrls: getRecordMediaUrls(newRecord)
    };

    res.status(201).json({ 
      success: true, 
      message: 'Record created successfully', 
      data: recordWithUrls 
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
      mediaUrls: getRecordMediaUrls(record)
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
    
    const recordWithUrls = {
      ...record,
      mediaUrls: getRecordMediaUrls(record)
    };
    
    res.status(200).json({ 
      success: true, 
      data: recordWithUrls 
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

// Update a record (text fields only)
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

    const updatedRecord = recordService.updateRecord(id, updateData);
    
    const recordWithUrls = {
      ...updatedRecord,
      mediaUrls: getRecordMediaUrls(updatedRecord)
    };
    
    res.status(200).json({ 
      success: true, 
      message: 'Record updated successfully', 
      data: recordWithUrls 
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

// Add a single media file to an existing record
export const addMedia = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No media file provided'
      });
    }

    const existingRecord = recordService.getRecordById(id);
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    const updatedRecord = recordService.addMediaToRecord(id, req.file);
    
    const recordWithUrls = {
      ...updatedRecord,
      mediaUrls: getRecordMediaUrls(updatedRecord)
    };

    res.status(200).json({
      success: true,
      message: 'Media added successfully',
      data: recordWithUrls
    });
  } catch (error) {
    console.error('Error adding media:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add media',
      error: error.message
    });
  }
};

// Delete a single media file from a record
export const deleteMedia = async (req, res) => {
  try {
    const { id, fileName } = req.params;

    const existingRecord = recordService.getRecordById(id);
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    const updatedRecord = recordService.deleteMediaFromRecord(id, decodeURIComponent(fileName));
    
    const recordWithUrls = {
      ...updatedRecord,
      mediaUrls: getRecordMediaUrls(updatedRecord)
    };

    res.status(200).json({
      success: true,
      message: 'Media deleted successfully',
      data: recordWithUrls
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete media',
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
