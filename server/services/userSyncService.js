import { clerkClient } from '@clerk/clerk-sdk-node';
import User from '../models/User.js';

class UserSyncService {
  // Sync user from Clerk to MongoDB
  static async syncUserFromClerk(clerkId) {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const primaryEmail = clerkUser.emailAddresses.find(
        email => email.id === clerkUser.primaryEmailAddressId
      );
      
      const googleAccount = clerkUser.externalAccounts?.find(
        account => account.provider === 'google'
      );

      const userData = {
        clerkId: clerkUser.id,
        email: primaryEmail?.emailAddress,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        provider: googleAccount ? 'google' : 'email',
        googleId: googleAccount?.providerUserId || null,
        profileImage: clerkUser.imageUrl,
        emailVerified: primaryEmail?.verification?.status === 'verified'
      };

      // Update or create user
      const user = await User.findOneAndUpdate(
        { clerkId },
        userData,
        { 
          new: true, 
          upsert: true,
          runValidators: true 
        }
      );

      return user;
    } catch (error) {
      console.error('Sync user from Clerk error:', error);
      throw error;
    }
  }

  static async getOrCreateUser(clerkId) {
    try {
      let user = await User.findOne({ clerkId });
      
      if (!user) {
        user = await this.syncUserFromClerk(clerkId);
      }

      return user;
    } catch (error) {
      console.error('Get or create user error:', error);
      throw error;
    }
  }

  static async batchSyncUsers(clerkIds) {
    const results = [];
    
    for (const clerkId of clerkIds) {
      try {
        const user = await this.syncUserFromClerk(clerkId);
        results.push({ success: true, user });
      } catch (error) {
        results.push({ success: false, clerkId, error: error.message });
      }
    }

    return results;
  }

  static async cleanupOrphanedUsers() {
    try {
      const dbUsers = await User.find({}, 'clerkId');
      const orphanedUsers = [];

      for (const dbUser of dbUsers) {
        try {
          await clerkClient.users.getUser(dbUser.clerkId);
        } catch (error) {
          if (error.status === 404) {
            orphanedUsers.push(dbUser.clerkId);
          }
        }
      }

      if (orphanedUsers.length > 0) {
        await User.deleteMany({ clerkId: { $in: orphanedUsers } });
        console.log(`Cleaned up ${orphanedUsers.length} orphaned users`);
      }

      return orphanedUsers.length;
    } catch (error) {
      console.error('Cleanup orphaned users error:', error);
      throw error;
    }
  }

  static async updateLastSeen(clerkId) {
    try {
      await User.findOneAndUpdate(
        { clerkId },
        { lastSeen: new Date() }
      );
    } catch (error) {
      console.error('Update last seen error:', error);
    }
  }
}

export default UserSyncService;