import express from 'express';
import crypto from 'crypto';
import User from '../models/User.js';

const router = express.Router();

router.post('/clerk-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    console.error('Webhook secret missing');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const headers = req.headers;
  const payload = req.body;

  console.log('Webhook received - body length:', req.body.length);  

  const svix_id = headers['svix-id'];
  const svix_timestamp = headers['svix-timestamp'];
  const svix_signature = headers['svix-signature'];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.log('Missing Svix headers');
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
        console.log('Signature verified successfully');
        break;
      }
    }
  }

  if (!isValid) {
    console.log('Signature invalid - rejecting');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let evt;
  try {
    evt = JSON.parse(body);
    console.log('Payload parsed - type:', evt.type, 'user ID: evt.data.id');
  } catch (err) {
    console.log('JSON parse error:', err.message);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { type, data } = evt;

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

// Handler functions - Full Mongoose save for name/email
async function handleUserCreated(userData) {
  const { id, email_addresses, first_name, last_name, external_accounts, image_url, family_name } = userData;
  
  console.log('Handling user.created - ID:', id, 'Email:', email_addresses?.[0]?.email_address);

  const primaryEmail = email_addresses.find(email => email.id === userData.primary_email_address_id);
  const googleAccount = external_accounts?.find(account => account.provider === 'google');

  const fullName = family_name ? family_name : `${first_name || ''} ${last_name || ''}`.trim() || 'Unknown User';

  // Upsert: Create or update user
  const user = await User.findOneAndUpdate(
    { clerkId: id },
    {
      clerkId: id,
      email: primaryEmail?.email_address,
      name: fullName,
      provider: googleAccount ? 'google' : 'email',
      googleId: googleAccount?.provider_user_id || null,
      profileImage: image_url,
      emailVerified: primaryEmail?.verification?.status === 'verified'
    },
    { upsert: true, new: true }  // Create if not exists, return updated
  );

  console.log('User created/updated:', user.email, '- Name:', user.name);
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
  
  await User.findOneAndDelete({ clerkId: id });
  console.log('User deleted:', id);
}

export default router;