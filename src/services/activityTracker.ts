import { prisma } from "../config/db";

export enum EventType {
  PRODUCT_VIEW = "PRODUCT_VIEW",
  BUTTON_CLICK = "BUTTON_CLICK",
  SEARCH = "SEARCH",
  ORDER = "ORDER",
  COMMAND = "COMMAND",
  ORDER_STATUS_UPDATE = "ORDER_STATUS_UPDATE",
  PAGE_VIEW = "PAGE_VIEW",
  CATEGORY_VIEW = "CATEGORY_VIEW",
  CART_ADD = "CART_ADD",
  CART_REMOVE = "CART_REMOVE",
  PRODUCT_GALLERY_NAV = "PRODUCT_GALLERY_NAV",
  PRODUCT_IMAGE_VIEW = "PRODUCT_IMAGE_VIEW",
}

export enum Source {
  TELEGRAM_BOT = "TELEGRAM_BOT",
  TELEGRAM_GROUP = "TELEGRAM_GROUP",
  WEBSITE = "WEBSITE",
}

export interface ActivityEventData {
  productId?: number;
  productName?: string;
  buttonName?: string;
  searchKeyword?: string;
  searchResultsCount?: number;
  orderId?: number;
  quantity?: number;
  orderStatus?: string;
  command?: string;
  pageName?: string;
  pageUrl?: string;
  categoryId?: number;
  categoryName?: string;
  galleryIndex?: number;
  imageIndex?: number;
  [key: string]: any;
}

export async function trackActivity(params: {
  userId?: bigint | null;
  username?: string | null;
  eventType: EventType;
  eventData: ActivityEventData;
  source?: Source;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        username: params.username || null,
        eventType: params.eventType,
        eventData: JSON.stringify(params.eventData),
        source: params.source || Source.TELEGRAM_BOT,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        sessionId: params.sessionId || null,
      },
    });
  } catch (error) {
    console.error("[ActivityTracker] Failed to log activity:", error);
    // Don't throw - tracking failures shouldn't break the main flow
  }
}

export async function trackProductView(params: {
  userId?: bigint;
  username?: string | null;
  productId: number;
  productName: string;
  source?: Source;
}) {
  return trackActivity({
    userId: params.userId,
    username: params.username,
    eventType: EventType.PRODUCT_VIEW,
    eventData: {
      productId: params.productId,
      productName: params.productName,
    },
    source: params.source,
  });
}

export async function trackButtonClick(params: {
  userId?: bigint;
  username?: string | null;
  buttonName: string;
  productId?: number;
  productName?: string;
  source?: Source;
}) {
  return trackActivity({
    userId: params.userId,
    username: params.username,
    eventType: EventType.BUTTON_CLICK,
    eventData: {
      buttonName: params.buttonName,
      productId: params.productId,
      productName: params.productName,
    },
    source: params.source,
  });
}

export async function trackSearch(params: {
  userId?: bigint;
  username?: string | null;
  searchKeyword: string;
  searchResultsCount?: number;
  source?: Source;
  sessionId?: string;
}) {
  return trackActivity({
    userId: params.userId,
    username: params.username,
    eventType: EventType.SEARCH,
    eventData: {
      searchKeyword: params.searchKeyword,
      searchResultsCount: params.searchResultsCount,
    },
    source: params.source,
    sessionId: params.sessionId,
  });
}

export async function trackOrder(params: {
  userId?: bigint;
  username?: string | null;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  source?: Source;
}) {
  return trackActivity({
    userId: params.userId,
    username: params.username,
    eventType: EventType.ORDER,
    eventData: {
      orderId: params.orderId,
      productId: params.productId,
      productName: params.productName,
      quantity: params.quantity,
    },
    source: params.source,
  });
}

export async function trackOrderStatusUpdate(params: {
  userId?: bigint | null;
  username?: string | null;
  orderId: number;
  oldStatus: string;
  newStatus: string;
  source?: Source;
}) {
  return trackActivity({
    userId: params.userId,
    username: params.username,
    eventType: EventType.ORDER_STATUS_UPDATE,
    eventData: {
      orderId: params.orderId,
      oldStatus: params.oldStatus,
      newStatus: params.newStatus,
    },
    source: params.source,
  });
}

export async function trackCommand(params: {
  userId?: bigint;
  username?: string | null;
  command: string;
  source?: Source;
}) {
  return trackActivity({
    userId: params.userId,
    username: params.username,
    eventType: EventType.COMMAND,
    eventData: {
      command: params.command,
    },
    source: params.source,
  });
}
