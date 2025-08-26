import express from 'express';
import { Webhook } from 'svix';
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

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(payload, headers);
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const { id, type, data } = evt;

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

// Handler functions
async function handleUserCreated(userData) {
  const { id, email_addresses, first_name, last_name, external_accounts, image_url } = userData;
  
  const primaryEmail = email_addresses.find(email => email.id === userData.primary_email_address_id);
  const googleAccount = external_accounts?.find(account => account.provider === 'google');
  
  const user = new User({
    clerkId: id,
    email: primaryEmail?.email_address,
    name: `${first_name || ''} ${last_name || ''}`.trim(),
    provider: googleAccount ? 'google' : 'email',
    googleId: googleAccount?.provider_user_id || null,
    profileImage: image_url,
    emailVerified: primaryEmail?.verification?.status === 'verified'
  });

  await user.save();
  console.log('User created:', user.email);
}

async function handleUserUpdated(userData) {
  const { id, email_addresses, first_name, last_name, image_url } = userData;
  
  const primaryEmail = email_addresses.find(email => email.id === userData.primary_email_address_id);
  
  await User.findOneAndUpdate(
    { clerkId: id },
    {
      email: primaryEmail?.email_address,
      name: `${first_name || ''} ${last_name || ''}`.trim(),
      profileImage: image_url,
      emailVerified: primaryEmail?.verification?.status === 'verified'
    }
  );
  
  console.log('User updated:', primaryEmail?.email_address);
}

async function handleUserDeleted(userData) {
  const { id } = userData;
  
  await User.findOneAndDelete({ clerkId: userData.id });
  console.log('User deleted:', id);
}

export default router;