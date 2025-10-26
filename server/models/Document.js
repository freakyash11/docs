import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: 'Untitled Document'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ownerId: {
    type: String,
    ref: 'User',
    required: true
  },
  collaborators: [{
    userId: {
      type: String,
      ref: 'User'
    },
    email: { type: String, required: true },
    permission: {
      type: String,
      enum: ['viewer', 'editor'],
      default: 'viewer'
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  lastModifiedBy: {
    type: String,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
documentSchema.index({ ownerId: 1 });
documentSchema.index({ 'collaborators.userId': 1 });

const Document = mongoose.model('Document', documentSchema);

export default Document;