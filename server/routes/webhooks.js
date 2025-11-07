import express from 'express';
import { createClerkClient } from '@clerk/backend';  // New import
import User from '../models/User.js';

const router = express.Router();

// Create Clerk client (uses CLERK_SECRET_KEY env var)
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

// Webhook endpoint
router.post('/clerk-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    console.log('Webhook received - body length:', req.body.length);  // Log incoming

    // Verify with Clerk SDK (auto-handles Svix)
    const body = req.body.toString();
    const event = clerk.webhooks.verify(body, req.headers);  // New method

    const { type, data } = event;
    console.log(`Webhook type: ${type}, User ID: ${data.id}`);  // Log event

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
    console.error('Webhook error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handler functions
async function handleUserCreated(userData) {
  const { id, email_addresses, first_name, last_name, external_accounts, image_url, family_name } = userData;
  
  console.log('Handling user.created - ID:', id, 'Email:', email_addresses?.[0]?.email_address);

  const primaryEmail = email_addresses.find(email => email.id === userData.primary_email_address_id);
  const googleAccount = external_accounts?.find(account => account.provider === 'google');

  const fullName = family_name ? family_name : `${first_name || ''} ${last_name || ''}`.trim() || 'Unknown User';

  const user = new User({
    clerkId: id,
    email: primaryEmail?.email_address,
    name: fullName,
    provider: googleAccount ? 'google' : 'email',
    googleId: googleAccount?.provider_user_id || null,
    profileImage: image_url,
    emailVerified: primaryEmail?.verification?.status === 'verified'
  });

  await user.save();
  console.log('User created:', user.email);
}

async function handleUserUpdated(userData) {
  const { id, email_addresses, first_name, last_name, image_url, family_name } = userData;
  
  console.log('Handling user.updated - ID:', id);

  const primaryEmail = email_addresses.find(email => email.id === userData.primary_email_address_id);
  const fullName = family_name ? family_name : `${first_name || ''} ${last_name || ''}`.trim();

  await User.findOneAndUpdate(
    { clerkId: id },
    {
      email: primaryEmail?.email_address,
      name: fullName,
      profileImage: image_url,
      emailVerified: primaryEmail?.verification?.status === 'verified'
    },
    { new: true }
  );

  console.log('User updated:', primaryEmail?.email_address);
}

async function handleUserDeleted(userData) {
  const { id } = userData;
  
  console.log('Handling user.deleted - ID:', id);
  
  const result = await User.findOneAndDelete({ clerkId: id });
  if (result) {
    console.log('User deleted:', result.email);
  } else {
    console.log('User not found for deletion:', id);
  }
}

export default router;