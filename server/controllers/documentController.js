import Document from '../models/Document.js';
import mongoose from 'mongoose';

// Create new document
export const createDocument = async (req, res) => {
  try {
    const { title } = req.body;
    
    const document = new Document({
      title: title || 'Untitled Document',
      ownerId: req.user._id,
      lastModifiedBy: req.user._id,
      data: {}
    });
    
    await document.save();
    
    res.status(201).json({
      id: document._id,
      title: document.title,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      ownerId: document.ownerId
    });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
};

// Get user's documents (owned or collaborator)
export const getUserDocuments = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const documents = await Document.find({
      $or: [
        { ownerId: userId },
        { 'collaborators.userId': userId }
      ]
    })
    .populate('ownerId', 'name email')
    .populate('collaborators.userId', 'name email')
    .sort({ updatedAt: -1 });
    
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
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

// Get single document by ID
export const getDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
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
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
};

// Update document metadata
export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, isPublic, collaborators } = req.body;
    const userId = req.user._id;
    
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
    
    res.json({
      id: updatedDocument._id,
      title: updatedDocument.title,
      owner: updatedDocument.ownerId.name,
      isPublic: updatedDocument.isPublic,
      updatedAt: updatedDocument.updatedAt
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
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
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};