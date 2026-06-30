import { prisma } from "../config/db";
import { bot } from "../bot/bot";
import { Server as SocketIOServer } from "socket.io";

export enum NotificationType {
  NEW_ORDER = "NEW_ORDER",
  ORDER_STATUS_CHANGE = "ORDER_STATUS_CHANGE",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  ORDER_COMPLETED = "ORDER_COMPLETED",
}

export enum DeliveryChannel {
  TELEGRAM = "TELEGRAM",
  DASHBOARD = "DASHBOARD",
}

export enum NotificationStatus {
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
  PENDING = "PENDING",
}

interface NotificationData {
  type: NotificationType;
  orderId: number;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

interface TelegramRecipient {
  type: "group" | "channel" | "individual";
  chatId: string;
}

class NotificationService {
  private io: SocketIOServer | null = null;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  private async getAdminRecipients(): Promise<TelegramRecipient[]> {
    const recipients: TelegramRecipient[] = [];

    // Get admin group from config
    const adminGroup = await prisma.adminConfig.findUnique({
      where: { key: "ADMIN_TELEGRAM_GROUP" },
    });
    if (adminGroup?.value) {
      recipients.push({ type: "group", chatId: adminGroup.value });
    }

    // Get admin channel from config
    const adminChannel = await prisma.adminConfig.findUnique({
      where: { key: "ADMIN_TELEGRAM_CHANNEL" },
    });
    if (adminChannel?.value) {
      recipients.push({ type: "channel", chatId: adminChannel.value });
    }

    // Get individual admin users
    const adminUsers = await prisma.adminConfig.findUnique({
      where: { key: "ADMIN_TELEGRAM_USERS" },
    });
    if (adminUsers?.value) {
      const userIds = adminUsers.value.split(",").map((id) => id.trim());
      userIds.forEach((userId) => {
        if (userId) {
          recipients.push({ type: "individual", chatId: userId });
        }
      });
    }

    return recipients;
  }

  private async logNotification(
    data: NotificationData,
    channel: DeliveryChannel,
    recipientId: string | null,
    status: NotificationStatus,
    errorMessage?: string
  ): Promise<void> {
    await prisma.adminNotification.create({
      data: {
        type: data.type,
        orderId: data.orderId,
        title: data.title,
        message: data.message,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        status,
        deliveryChannel: channel,
        recipientId,
        errorMessage,
      },
    });
  }

  private async sendTelegramMessage(
    recipient: TelegramRecipient,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await bot.telegram.sendMessage(recipient.chatId, message, {
        parse_mode: "HTML",
      });
      return { success: true };
    } catch (error: any) {
      console.error(`Failed to send Telegram message to ${recipient.chatId}:`, error);
      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  }

  private async sendTelegramNotification(
    data: NotificationData,
    recipient: TelegramRecipient,
    retryCount = 0
  ): Promise<void> {
    const result = await this.sendTelegramMessage(recipient, data.message);

    if (result.success) {
      await this.logNotification(
        data,
        DeliveryChannel.TELEGRAM,
        recipient.chatId,
        NotificationStatus.DELIVERED
      );
    } else {
      await this.logNotification(
        data,
        DeliveryChannel.TELEGRAM,
        recipient.chatId,
        NotificationStatus.FAILED,
        result.error
      );

      // Retry logic
      if (retryCount < this.maxRetries) {
        console.log(
          `Retrying Telegram notification to ${recipient.chatId}. Attempt ${retryCount + 1}/${this.maxRetries}`
        );
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        await this.sendTelegramNotification(data, recipient, retryCount + 1);
      }
    }
  }

  private sendDashboardNotification(data: NotificationData): void {
    if (!this.io) {
      console.warn("Socket.IO not initialized, skipping dashboard notification");
      return;
    }

    this.io.emit("admin_notification", {
      type: data.type,
      orderId: data.orderId,
      title: data.title,
      message: data.message,
      metadata: data.metadata,
      timestamp: new Date().toISOString(),
    });

    // Log dashboard notification
    this.logNotification(
      data,
      DeliveryChannel.DASHBOARD,
      null,
      NotificationStatus.DELIVERED
    ).catch((err) => console.error("Failed to log dashboard notification:", err));
  }

  async notifyNewOrder(order: any): Promise<void> {
    const user = order.user
      ? await prisma.telUser.findUnique({
          where: { id: order.userId },
        })
      : null;

    // Build products list from order items
    let productsList = "";
    let totalItems = 0;
    let totalProducts = 0;

    if (order.items && order.items.length > 0) {
      totalProducts = order.items.length;
      order.items.forEach((item: any) => {
        const productName = item.product?.nameUz || item.product?.nameRu || "Unknown Product";
        const quantity = item.quantity || 1;
        totalItems += quantity;
        productsList += `• ${productName} × ${quantity}\n`;
      });
    } else {
      // Fallback for old orders without items
      productsList = `• Unknown Product × 1\n`;
      totalItems = 1;
      totalProducts = 1;
    }

    const message = `
🛒 <b>New Order Received</b>

<b>Order ID:</b> #${order.id}
<b>Source:</b> ${order.source || "WEBSITE"}
<b>Customer:</b> ${order.fullName}
<b>Phone:</b> ${order.phoneNumber}
${user ? `<b>Telegram:</b> @${user.username || "N/A"}\n<b>User ID:</b> ${user.id}` : ""}

<b>Products:</b>
${productsList}
<b>Total Items:</b> ${totalItems}
<b>Total Products:</b> ${totalProducts}
${order.totalAmount ? `<b>Total Amount:</b> ${order.totalAmount.toLocaleString()} so'm` : ""}

${order.notes ? `<b>Notes:</b> ${order.notes}` : ""}

<b>Date:</b> ${new Date(order.createdAt).toLocaleString()}
`;

    const data: NotificationData = {
      type: NotificationType.NEW_ORDER,
      orderId: order.id,
      title: "New Order Received",
      message,
      metadata: {
        customerName: order.fullName,
        phoneNumber: order.phoneNumber,
        totalItems,
        totalProducts,
        totalAmount: order.totalAmount,
        username: user?.username,
      },
    };

    // Send to all Telegram recipients
    const recipients = await this.getAdminRecipients();
    for (const recipient of recipients) {
      await this.sendTelegramNotification(data, recipient);
    }

    // Send to dashboard
    this.sendDashboardNotification(data);
  }

  async notifyOrderStatusChange(
    order: any,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    const statusEmojis: Record<string, string> = {
      PENDING: "⏳",
      PROCESSING: "🔄",
      COMPLETED: "✅",
      CANCELLED: "❌",
    };

    const message = `
📦 <b>Order Status Updated</b>

<b>Order ID:</b> #${order.id}
<b>Status:</b> ${statusEmojis[newStatus] || ""} ${oldStatus} → ${newStatus}

<b>Customer:</b> ${order.fullName}
<b>Phone:</b> ${order.phoneNumber}

<b>Date:</b> ${new Date().toLocaleString()}
`;

    const data: NotificationData = {
      type: NotificationType.ORDER_STATUS_CHANGE,
      orderId: order.id,
      title: `Order Status: ${newStatus}`,
      message,
      metadata: {
        oldStatus,
        newStatus,
        customerName: order.fullName,
      },
    };

    // Send to all Telegram recipients
    const recipients = await this.getAdminRecipients();
    for (const recipient of recipients) {
      await this.sendTelegramNotification(data, recipient);
    }

    // Send to dashboard
    this.sendDashboardNotification(data);
  }

  async notifyOrderCancelled(order: any): Promise<void> {
    const message = `
❌ <b>Order Cancelled</b>

<b>Order ID:</b> #${order.id}
<b>Customer:</b> ${order.fullName}
<b>Phone:</b> ${order.phoneNumber}

<b>Date:</b> ${new Date().toLocaleString()}
`;

    const data: NotificationData = {
      type: NotificationType.ORDER_CANCELLED,
      orderId: order.id,
      title: "Order Cancelled",
      message,
      metadata: {
        customerName: order.fullName,
        phoneNumber: order.phoneNumber,
      },
    };

    // Send to all Telegram recipients
    const recipients = await this.getAdminRecipients();
    for (const recipient of recipients) {
      await this.sendTelegramNotification(data, recipient);
    }

    // Send to dashboard
    this.sendDashboardNotification(data);
  }

  async notifyOrderCompleted(order: any): Promise<void> {
    const message = `
✅ <b>Order Completed</b>

<b>Order ID:</b> #${order.id}
<b>Customer:</b> ${order.fullName}
<b>Phone:</b> ${order.phoneNumber}

<b>Date:</b> ${new Date().toLocaleString()}
`;

    const data: NotificationData = {
      type: NotificationType.ORDER_COMPLETED,
      orderId: order.id,
      title: "Order Completed",
      message,
      metadata: {
        customerName: order.fullName,
        phoneNumber: order.phoneNumber,
      },
    };

    // Send to all Telegram recipients
    const recipients = await this.getAdminRecipients();
    for (const recipient of recipients) {
      await this.sendTelegramNotification(data, recipient);
    }

    // Send to dashboard
    this.sendDashboardNotification(data);
  }

  async getNotificationHistory(limit = 50): Promise<any[]> {
    return prisma.adminNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getUnreadNotificationCount(): Promise<number> {
    return prisma.adminNotification.count({
      where: {
        status: NotificationStatus.DELIVERED,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });
  }

  async setAdminConfig(key: string, value: string, description?: string): Promise<void> {
    await prisma.adminConfig.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
  }

  async getAdminConfig(key: string): Promise<string | null> {
    const config = await prisma.adminConfig.findUnique({
      where: { key },
    });
    return config?.value || null;
  }
}

export const notificationService = new NotificationService();
