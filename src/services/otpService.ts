import { prisma } from "../config/db";
import { bot } from "../bot/bot";

interface OtpRequestOptions {
  phoneNumber: string;
  ipAddress?: string;
  userAgent?: string;
  fullName?: string;
  isRegistration?: boolean;
}

interface OtpVerificationOptions {
  phoneNumber: string;
  otpCode: string;
  ipAddress?: string;
  userAgent?: string;
  fullName?: string;
  isRegistration?: boolean;
}

interface OtpResult {
  success: boolean;
  message: string;
  telegramChatId?: string;
  userId?: bigint;
}

class OtpService {
  private readonly OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6');
  private readonly OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');
  private readonly MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');
  private readonly RATE_LIMIT_MINUTES = parseInt(process.env.OTP_RATE_LIMIT_MINUTES || '1');
  private readonly MAX_REQUESTS_PER_MINUTE = parseInt(process.env.OTP_MAX_REQUESTS_PER_MINUTE || '3');

  /**
   * Generate a random numeric OTP code
   */
  private generateOtpCode(): string {
    const code = Math.floor(Math.random() * 1000000).toString();
    return code.padStart(this.OTP_LENGTH, '0');
  }

  /**
   * Find Telegram user by phone number
   */
  private async findTelegramUserByPhone(phoneNumber: string): Promise<{ chatId: string; userId: bigint } | null> {
    // First try to find by customer phone number
    const customer = await prisma.customer.findFirst({
      where: { phoneNumber },
      include: { user: true }
    });

    if (customer?.user) {
      return {
        chatId: customer.user.id.toString(),
        userId: customer.user.id
      };
    }

    // If not found in customers, try to match phone numbers from Telegram user data
    // This would require storing phone numbers in TelUser or having a separate mapping
    // For now, we'll rely on the customer table
    return null;
  }

  /**
   * Clean up expired OTP records
   */
  private async cleanupExpiredOtps(): Promise<void> {
    await prisma.otpVerification.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() }
      },
      data: { status: 'EXPIRED' }
    });
  }

  /**
   * Check rate limiting for OTP requests
   */
  private async checkRateLimit(phoneNumber: string, ipAddress?: string): Promise<{ allowed: boolean; message: string }> {
    const now = new Date();
    const minutesAgo = new Date(now.getTime() - this.RATE_LIMIT_MINUTES * 60 * 1000);

    // Check by phone number
    const phoneCount = await prisma.otpVerification.count({
      where: {
        phoneNumber,
        createdAt: { gte: minutesAgo }
      }
    });

    if (phoneCount >= this.MAX_REQUESTS_PER_MINUTE) {
      return {
        allowed: false,
        message: `Too many requests. Please wait ${this.RATE_LIMIT_MINUTES} minute(s) before trying again.`
      };
    }

    // Check by IP address if provided
    if (ipAddress) {
      const ipCount = await prisma.otpVerification.count({
        where: {
          ipAddress,
          createdAt: { gte: minutesAgo }
        }
      });

      if (ipCount >= this.MAX_REQUESTS_PER_MINUTE * 2) {
        return {
          allowed: false,
          message: `Too many requests from this IP. Please wait ${this.RATE_LIMIT_MINUTES} minute(s) before trying again.`
        };
      }
    }

    return { allowed: true, message: '' };
  }

  /**
   * Request an OTP code for phone number verification
   */
  async requestOtp(options: OtpRequestOptions): Promise<OtpResult> {
    const { phoneNumber, ipAddress, userAgent, isRegistration } = options;

    // Clean up expired OTPs first
    await this.cleanupExpiredOtps();

    // Check rate limiting
    const rateLimit = await this.checkRateLimit(phoneNumber, ipAddress);
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: rateLimit.message
      };
    }

    // Find linked Telegram account
    const telegramUser = await this.findTelegramUserByPhone(phoneNumber);

    // For registration without Telegram, we'll allow it and create user later
    if (!telegramUser && !isRegistration) {
      return {
        success: false,
        message: 'Phone number not found. Please register first or start the Telegram bot to link your account.'
      };
    }

    // Generate OTP code
    const otpCode = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Invalidate any previous pending OTPs for this phone number
    await prisma.otpVerification.updateMany({
      where: {
        phoneNumber,
        status: 'PENDING'
      },
      data: { status: 'EXPIRED' }
    });

    // Store OTP in database
    await prisma.otpVerification.create({
      data: {
        phoneNumber,
        otpCode,
        telegramChatId: telegramUser?.chatId || null,
        status: 'PENDING',
        expiresAt,
        ipAddress,
        userAgent
      }
    });

    // Send OTP via Telegram if user exists
    if (telegramUser) {
      try {
        await bot.telegram.sendMessage(telegramUser.chatId, 
          `🔐 <b>Tasdiqlash kodi</b>\n\n` +
          `Sizning tasdiqlash kodingiz: <code>${otpCode}</code>\n\n` +
          `⏰ Kod ${this.OTP_EXPIRY_MINUTES} daqiqa ichida amal qiladi.\n\n` +
          `⚠️ Hech kimga bu kodni bermang!`,
          { parse_mode: 'HTML' }
        );

        return {
          success: true,
          message: 'OTP code sent to your Telegram account',
          telegramChatId: telegramUser.chatId,
          userId: telegramUser.userId
        };
      } catch (error) {
        console.error('Failed to send OTP via Telegram:', error);
        
        // Mark OTP as failed
        await prisma.otpVerification.updateMany({
          where: {
            phoneNumber,
            otpCode,
            status: 'PENDING'
          },
          data: { status: 'EXPIRED' }
        });

        return {
          success: false,
          message: 'Failed to send OTP code. Please ensure you have started the Telegram bot.'
        };
      }
    }

    // For registration without Telegram, return the OTP in response (for demo/testing)
    // In production, you would use SMS or email instead
    return {
      success: true,
      message: `OTP code generated: ${otpCode} (In production, this would be sent via SMS/Email)`,
      telegramChatId: undefined,
      userId: undefined
    };
  }

  /**
   * Verify an OTP code
   */
  async verifyOtp(options: OtpVerificationOptions): Promise<OtpResult> {
    const { phoneNumber, otpCode, ipAddress, userAgent, fullName, isRegistration } = options;

    // Clean up expired OTPs first
    await this.cleanupExpiredOtps();

    // Find the OTP record
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        phoneNumber,
        otpCode,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    });

    if (!otpRecord) {
      return {
        success: false,
        message: 'Invalid or expired OTP code'
      };
    }

    // Check attempt count
    if (otpRecord.attemptCount >= this.MAX_ATTEMPTS) {
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { status: 'EXPIRED' }
      });

      return {
        success: false,
        message: 'Maximum attempts exceeded. Please request a new OTP code.'
      };
    }

    // Increment attempt count
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: {
        attemptCount: otpRecord.attemptCount + 1,
        ipAddress: ipAddress || otpRecord.ipAddress,
        userAgent: userAgent || otpRecord.userAgent
      }
    });

    // Verify the code
    if (otpRecord.otpCode !== otpCode) {
      return {
        success: false,
        message: `Invalid OTP code. ${this.MAX_ATTEMPTS - otpRecord.attemptCount - 1} attempts remaining.`
      };
    }

    // Mark OTP as used
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: {
        status: 'USED',
        usedAt: new Date()
      }
    });

    // Get or create user information
    let telegramUser = await this.findTelegramUserByPhone(phoneNumber);

    // If this is registration and no user exists, create one
    if (isRegistration && !telegramUser && fullName) {
      try {
        // Generate a unique user ID based on phone number and timestamp
        const userId = BigInt(Date.now());
        
        // Create TelUser
        const newUser = await prisma.telUser.create({
          data: {
            id: userId,
            language: 'uz',
            isAdmin: false
          }
        });

        // Create Customer
        await prisma.customer.create({
          data: {
            userId: userId,
            fullName: fullName,
            phoneNumber: phoneNumber
          }
        });

        telegramUser = {
          chatId: userId.toString(),
          userId: userId
        };
      } catch (error) {
        console.error('Failed to create user during registration:', error);
        return {
          success: false,
          message: 'Failed to create user account. Please try again.'
        };
      }
    }

    return {
      success: true,
      message: 'OTP verified successfully',
      telegramChatId: otpRecord.telegramChatId || telegramUser?.chatId || undefined,
      userId: telegramUser?.userId
    };
  }

  /**
   * Get OTP statistics (for admin monitoring)
   */
  async getOtpStats() {
    const total = await prisma.otpVerification.count();
    const pending = await prisma.otpVerification.count({ where: { status: 'PENDING' } });
    const used = await prisma.otpVerification.count({ where: { status: 'USED' } });
    const expired = await prisma.otpVerification.count({ where: { status: 'EXPIRED' } });

    return {
      total,
      pending,
      used,
      expired,
      successRate: total > 0 ? (used / total * 100).toFixed(2) : '0'
    };
  }

  /**
   * Clean up old OTP records (can be run periodically)
   */
  async cleanupOldOtps(daysToKeep: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await prisma.otpVerification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
  }
}

export const otpService = new OtpService();