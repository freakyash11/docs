import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  provider: {
    type: String,
    enum: ['email', 'google', 'github', 'discord'],
    default: 'email'
  },
  googleId: {
    type: String,
    sparse: true, // Allows null values but ensures uniqueness when present
    unique: true
  },
  clerkId: {
    type: String,
    required: true,
    unique: true
  },
  profileImage: {
    type: String,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ clerkId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;