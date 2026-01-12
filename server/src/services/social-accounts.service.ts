import { prisma } from '../index';
import { platformFactory } from './platform-factory.service';

export class SocialAccountsService {
  /**
   * Connect Instagram account using OAuth code
   */
  async connectInstagramAccount(userId: string, oauthCode: string) {
    try {
      const adapter = platformFactory.getAdapter('instagram');
      const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || '';

      // Connect account via adapter
      const connectedAccount = await adapter.connectAccount(oauthCode, redirectUri);

      // Check if account already exists
      const existing = await prisma.socialAccount.findFirst({
        where: {
          userId,
          platform: 'instagram',
          platformUserId: connectedAccount.platformUserId,
        },
      });

      if (existing) {
        // Update existing account
        return prisma.socialAccount.update({
          where: { id: existing.id },
          data: {
            platformUsername: connectedAccount.platformUsername,
            accessToken: connectedAccount.accessToken,
            refreshToken: connectedAccount.refreshToken,
            tokenExpiresAt: connectedAccount.tokenExpiresAt,
            isActive: true,
          },
        });
      }

      // Create new account
      return prisma.socialAccount.create({
        data: {
          userId,
          platform: 'instagram',
          platformUserId: connectedAccount.platformUserId,
          platformUsername: connectedAccount.platformUsername,
          accessToken: connectedAccount.accessToken,
          refreshToken: connectedAccount.refreshToken,
          tokenExpiresAt: connectedAccount.tokenExpiresAt,
          isActive: true,
        },
      });
    } catch (error: any) {
      console.error(`Failed to connect Instagram account: ${error.message}`, error.stack);
      throw new Error(`Failed to connect Instagram account: ${error.message}`);
    }
  }

  /**
   * Get user's connected accounts
   */
  async getUserAccounts(userId: string) {
    return prisma.socialAccount.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get single account
   */
  async getAccountById(accountId: string, userId: string) {
    const account = await prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      throw new Error('Social account not found');
    }

    return account;
  }

  /**
   * Validate account connection
   */
  async validateAccount(accountId: string, userId: string) {
    const account = await this.getAccountById(accountId, userId);

    const adapter = platformFactory.getAdapter(account.platform);
    const isValid = await adapter.validateAccount(account.platformUserId, account.accessToken);

    if (!isValid) {
      // Try to refresh token
      if (account.refreshToken || account.tokenExpiresAt) {
        try {
          const refreshed = await adapter.refreshToken(
            account.platformUserId,
            account.refreshToken || account.accessToken,
          );

          // Update account
          await prisma.socialAccount.update({
            where: { id: accountId },
            data: {
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken,
              tokenExpiresAt: refreshed.tokenExpiresAt,
            },
          });

          return true;
        } catch (error: any) {
          console.warn(`Failed to refresh token for account ${accountId}: ${error.message}`);
          
          // Deactivate account
          await prisma.socialAccount.update({
            where: { id: accountId },
            data: { isActive: false },
          });

          return false;
        }
      }

      // Deactivate account
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: { isActive: false },
      });

      return false;
    }

    return true;
  }

  /**
   * Disconnect account
   */
  async disconnectAccount(accountId: string, userId: string) {
    const account = await this.getAccountById(accountId, userId);

    try {
      const adapter = platformFactory.getAdapter(account.platform);
      await adapter.disconnectAccount(account.platformUserId, account.accessToken);
    } catch (error: any) {
      console.warn(`Error during disconnect: ${error.message}`);
    }

    // Deactivate account
    return prisma.socialAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    });
  }
}

export const socialAccountsService = new SocialAccountsService();

