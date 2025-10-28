import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema } = mongoose;

const invitationSchema = new Schema({
  docId: {
    type: Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  role: {
    type: String,
    enum: ['owner', 'editor', 'viewer'],
    required: true,
    default: 'viewer'
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'revoked', 'expired'],
    default: 'pending',
    required: true,
    index: true
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  revokedAt: {
    type: Date,
    default: null
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0
  },
  // Optional security/logging fields
  notes: {
    type: String,
    maxlength: 500
  },
  ip: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
invitationSchema.index({ docId: 1, email: 1, status: 1 });
invitationSchema.index({ email: 1, status: 1 });
invitationSchema.index({ tokenHash: 1, status: 1 });
invitationSchema.index({ expiresAt: 1, status: 1 });

// Virtual field: check if invitation is expired
invitationSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date() || this.status === 'expired';
});

// Virtual field: check if invitation is valid (can be accepted)
invitationSchema.virtual('isValid').get(function() {
  return this.status === 'pending' && 
         this.expiresAt > new Date() &&
         this.attempts < 5; // Max 5 attempts
});

// Static method: Generate secure token (32 bytes = 64 hex chars)
invitationSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Static method: Hash token for storage
invitationSchema.statics.hashToken = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Static method: Create invitation with token
invitationSchema.statics.createInvitation = async function(data) {
  const { docId, email, role, invitedBy, notes, ip, userAgent } = data;
  
  // Generate plain token (to send via email - don't store!)
  const plainToken = this.generateToken();
  
  // Hash token for storage
  const tokenHash = this.hashToken(plainToken);
  
  // Check for existing pending invitation
  const existingInvite = await this.findOne({
    docId,
    email,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });
  
  if (existingInvite) {
    throw new Error('Active invitation already exists for this email');
  }
  
  // Create invitation
  const invitation = await this.create({
    docId,
    email,
    role,
    tokenHash,
    invitedBy,
    notes,
    ip,
    userAgent,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });
  
  // Return invitation with plain token (only once!)
  return {
    invitation,
    plainToken // Send this via email, never store it
  };
};

// Static method: Find by plain token
invitationSchema.statics.findByToken = async function(plainToken) {
  const tokenHash = this.hashToken(plainToken);
  return await this.findOne({ tokenHash });
};

// Instance method: Accept invitation
invitationSchema.methods.accept = async function() {
  if (this.status !== 'pending') {
    throw new Error('Invitation is not pending');
  }
  
  if (this.expiresAt < new Date()) {
    this.status = 'expired';
    await this.save();
    throw new Error('Invitation has expired');
  }
  
  this.status = 'accepted';
  this.acceptedAt = new Date();
  await this.save();
  
  return this;
};

// Instance method: Revoke invitation
invitationSchema.methods.revoke = async function() {
  if (this.status === 'accepted') {
    throw new Error('Cannot revoke accepted invitation');
  }
  
  this.status = 'revoked';
  this.revokedAt = new Date();
  await this.save();
  
  return this;
};

// Instance method: Increment attempt counter
invitationSchema.methods.incrementAttempts = async function() {
  this.attempts += 1;
  
  // Auto-expire after 5 failed attempts
  if (this.attempts >= 5) {
    this.status = 'expired';
  }
  
  await this.save();
  return this;
};

// Middleware: Auto-expire old pending invitations before save
invitationSchema.pre('save', function(next) {
  if (this.status === 'pending' && this.expiresAt < new Date()) {
    this.status = 'expired';
  }
  next();
});

// Middleware: Populate references on find queries
invitationSchema.pre(/^find/, function(next) {
  this.populate('invitedBy', 'name email')
      .populate('docId', 'title ownerId');
  next();
});

const Invitation = mongoose.model('Invitation', invitationSchema);

export default Invitation;