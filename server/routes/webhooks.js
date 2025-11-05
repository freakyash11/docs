import express from 'express';
import crypto from 'crypto';
import User from '../models/User.js';

const router = express.Router();

// Webhook endpoint
router.post('/clerk-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const headers = req.headers;
  const payload = req.body;

  // Verify webhook signature using crypto
  const svix_id = headers['svix-id'];
  const svix_timestamp = headers['svix-timestamp'];
  const svix_signature = headers['svix-signature'];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  const body = payload.toString();
  const secret = WEBHOOK_SECRET.split('_')[1]; // Remove 'whsec_' prefix
  const secretBytes = Buffer.from(secret, 'base64');
  
  const signedPayload = `${svix_id}.${svix_timestamp}.${body}`;
  const expectedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedPayload)
    .digest('base64');

  const signatures = svix_signature.split(' ');
  let isValid = false;
  
  for (const sig of signatures) {
    const [version, signature] = sig.split(',');
    if (version === 'v1') {
      if (crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expectedSignature, 'base64')
      )) {
        isValid = true;
        break;
      }
    }
  }

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let evt;
  try {
    evt = JSON.parse(body);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { type, data } = evt;

  console.log(`Webhook received: ${type} for user ID: ${data.id}`);

  try {
    switch (type) {
      case 'user.created':
        await handleUserCreated(data);
        break;
      
      case 'user.updated':
        await handleUserUpdated(data);
        break;
      
      case 'user.deleted':
        await handleUserDeleted(data);
        break;
      
      default:
        console.log(`Unhandled webhook type: ${type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Helper function to determine provider
function getProvider(external_accounts) {
  if (!external_accounts || external_accounts.length === 0) {
    return 'email';
  }
  
  const account = external_accounts[0];
  const provider = account.provider?.toLowerCase();
  
  // Map provider to User schema enum values
  if (['google', 'github', 'discord'].includes(provider)) {
    return provider;
  }
  
  return 'email';
}

// Helper function to get provider ID
function getProviderId(external_accounts, providerName) {
  if (!external_accounts || external_accounts.length === 0) {
    return null;
  }
  
  const account = external_accounts.find(
    acc => acc.provider?.toLowerCase() === providerName
  );
  
  return account?.provider_user_id || null;
}

// Handler functions
async function handleUserCreated(userData) {
  const { 
    id, 
    email_addresses, 
    first_name, 
    last_name, 
    external_accounts, 
    image_url,
    primary_email_address_id 
  } = userData;
  
  console.log('Handling user.created - ID:', id);
  
  // Get email address - handle empty array case
  let email = null;
  if (email_addresses && email_addresses.length > 0) {
    const primaryEmail = email_addresses.find(
      emailObj => emailObj.id === primary_email_address_id
    );
    email = primaryEmail?.email_address || email_addresses[0]?.email_address;
  }
  
  // Determine provider and get provider ID
  const provider = getProvider(external_accounts);
  const googleId = getProviderId(external_accounts, 'google');
  
  // Build name - handle null values
  const firstName = first_name || '';
  const lastName = last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'User';
  
  // Check if email is verified
  let emailVerified = false;
  if (email_addresses && email_addresses.length > 0) {
    const primaryEmail = email_addresses.find(
      emailObj => emailObj.id === primary_email_address_id
    );
    emailVerified = primaryEmail?.verification?.status === 'verified';
  }
  
  // Validate required fields before creating
  if (!email) {
    console.error('Cannot create user: email is missing');
    throw new Error('Email is required to create user');
  }
  
  try {
    const user = new User({
      clerkId: id,
      email: email,
      name: fullName,
      provider: provider,
      googleId: googleId,
      profileImage: image_url || null,
      emailVerified: emailVerified,
      lastSeen: new Date()
    });

    await user.save();
    console.log('User created successfully:', email);
  } catch (error) {
    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      console.log('User already exists, attempting update instead');
      await handleUserUpdated(userData);
    } else {
      throw error;
    }
  }
}

async function handleUserUpdated(userData) {
  const { 
    id, 
    email_addresses, 
    first_name, 
    last_name, 
    image_url,
    primary_email_address_id 
  } = userData;
  
  console.log('Handling user.updated - ID:', id);
  
  // Get email address - handle empty array case
  let email = null;
  if (email_addresses && email_addresses.length > 0) {
    const primaryEmail = email_addresses.find(
      emailObj => emailObj.id === primary_email_address_id
    );
    email = primaryEmail?.email_address || email_addresses[0]?.email_address;
  }
  
  // Build name - handle null values
  const firstName = first_name || '';
  const lastName = last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  // Check if email is verified
  let emailVerified = false;
  if (email_addresses && email_addresses.length > 0) {
    const primaryEmail = email_addresses.find(
      emailObj => emailObj.id === primary_email_address_id
    );
    emailVerified = primaryEmail?.verification?.status === 'verified';
  }
  
  // Build update object - only include fields that exist
  const updateData = {
    lastSeen: new Date()
  };
  
  if (email) updateData.email = email;
  if (fullName) updateData.name = fullName;
  if (image_url !== undefined) updateData.profileImage = image_url;
  updateData.emailVerified = emailVerified;
  
  const result = await User.findOneAndUpdate(
    { clerkId: id },
    updateData,
    { new: true }
  );
  
  if (result) {
    console.log('User updated successfully:', email || id);
  } else {
    console.log('User not found for update, may need to create:', id);
  }
}

async function handleUserDeleted(userData) {
  const { id } = userData;
  
  console.log('Handling user.deleted - ID:', id);
  
  const result = await User.findOneAndDelete({ clerkId: id });
  if (result) {
    console.log('User deleted successfully:', id);
  } else {
    console.log('User not found for deletion:', id);
  }
}

export default router;
