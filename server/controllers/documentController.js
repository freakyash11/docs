import Document from '../models/Document.js';
import mongoose from 'mongoose';

// Create new document
export const createDocument = async (req, res) => {
  try {
    console.log('createDocument called - userId:', req.userId, 'Body:', req.body);  // Use req.userId
    const { title } = req.body;
    
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const document = new Document({
      title: title || 'Untitled Document',
      ownerId: req.userId,  // Fixed: Use req.userId from middleware, not req.user._id
      lastModifiedBy: req.userId,  // Fixed: Use req.userId
      data: {}
    });
    
    await document.save();
    console.log('Document created successfully:', document._id);
    
    res.status(201).json({
      id: document._id,
      title: document.title,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      ownerId: document.ownerId
    });
  } catch (error) {
    console.error('Create document detailed error:', error.message, 'Stack:', error.stack);
    res.status(500).json({ error: 'Failed to create document' });
  }
};

// Get user's documents (owned or collaborator)
export const getUserDocuments = async (req, res) => {
  try {
    console.log('getUserDocuments called - userId:', req.userId);  // Use req.userId
    const userId = req.userId;  // Fixed: Use req.userId
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const documents = await Document.find({
      $or: [
        { ownerId: userId },
        { 'collaborators.userId': userId }
      ]
    })
    .populate('ownerId', 'name email')
    .populate('collaborators.userId', 'name email')
    .sort({ updatedAt: -1 });
    
    console.log('Documents fetched:', documents.length);
    
    const formattedDocs = documents.map(doc => ({
      id: doc._id,
      title: doc.title,
      owner: doc.ownerId.name,
      isOwner: doc.ownerId._id.toString() === userId.toString(),
      collaborators: doc.collaborators.length,
      isPublic: doc.isPublic,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }));
    
    res.json({ documents: formattedDocs });
  } catch (error) {
    console.error('Get documents detailed error:', error.message, 'Stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

// Get single document by ID
export const getDocument = async (req, res) => {
  try {
    console.log('getDocument called - id:', req.params.id, 'userId:', req.userId);  // Use req.userId
    const { id } = req.params;
    const userId = req.userId;  // Fixed: Use req.userId
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    const document = await Document.findById(id)
      .populate('ownerId', 'name email')
      .populate('collaborators.userId', 'name email');
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check permissions
    const isOwner = document.ownerId._id.toString() === userId.toString();
    const isCollaborator = document.collaborators.some(
      collab => collab.userId._id.toString() === userId.toString()
    );
    
    if (!isOwner && !isCollaborator && !document.isPublic) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log('Document fetched:', document._id);
    
    res.json({
      id: document._id,
      title: document.title,
      data: document.data,
      owner: document.ownerId.name,
      isOwner,
      collaborators: document.collaborators.map(collab => ({
        name: collab.userId.name,
        email: collab.userId.email,
        permission: collab.permission
      })),
      isPublic: document.isPublic,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    });
  } catch (error) {
    console.error('Get document detailed error:', error.message, 'Stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
};

// Update document metadata
export const updateDocument = async (req, res) => {
  try {
    console.log('updateDocument called - id:', req.params.id, 'userId:', req.userId, 'Body:', req.body);  // Use req.userId
    const { id } = req.params;
    const { title, isPublic, collaborators } = req.body;
    const userId = req.userId;  // Fixed: Use req.userId
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    const document = await Document.findById(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Only owner can update metadata
    if (document.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only owner can update document metadata' });
    }
    
    const updateData = { lastModifiedBy: userId };
    
    if (title !== undefined) updateData.title = title;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (collaborators !== undefined) updateData.collaborators = collaborators;
    
    const updatedDocument = await Document.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('ownerId', 'name email');
    
    console.log('Document updated:', updatedDocument._id);
    
    res.json({
      id: updatedDocument._id,
      title: updatedDocument.title,
      owner: updatedDocument.ownerId.name,
      isPublic: updatedDocument.isPublic,
      updatedAt: updatedDocument.updatedAt
    });
  } catch (error) {
    console.error('Update document detailed error:', error.message, 'Stack:', error.stack);
    res.status(500).json({ error: 'Failed to update document' });
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    console.log('deleteDocument called - id:', req.params.id, 'userId:', req.userId);  // Use req.userId
    const { id } = req.params;
    const userId = req.userId;  // Fixed: Use req.userId
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    const document = await Document.findById(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Only owner can delete
    if (document.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only owner can delete document' });
    }
    
    await Document.findByIdAndDelete(id);
    console.log('Document deleted:', id);
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document detailed error:', error.message, 'Stack:', error.stack);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};