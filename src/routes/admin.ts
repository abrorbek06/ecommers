import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { bot } from "../bot/bot";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { trackOrderStatusUpdate, Source } from "../services/activityTracker";
import { notificationService } from "../services/notificationService";

const router = Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

// Multer: Store uploads in system temp dir, limit 50MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|webm/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Allowed: images and videos."));
    }
  }
});

// Simple middleware to check admin authorization
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-admin-password"] || req.query.token;
  if (token === ADMIN_PASSWORD) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized access" });
}

// 1. Authenticate / Login check
router.post("/login", (req: Request, res: Response) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: ADMIN_PASSWORD });
  }
  return res.status(400).json({ error: "Invalid password" });
});

// Apply auth middleware to all routes below
router.use(adminAuthMiddleware);

// 2. Stats overview
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.telUser.count();
    const totalChannels = await prisma.confirmChannel.count();
    const totalModels = await prisma.vehicleModel.count();
    const totalProducts = await prisma.product.count();
    const totalOrders = await prisma.order.count();
    const pendingOrders = await prisma.order.count({ where: { status: 'PENDING' as any } });
    const completedOrders = await prisma.order.count({ where: { status: 'COMPLETED' as any } });

    return res.json({
      totalUsers,
      totalChannels,
      totalModels,
      totalProducts,
      totalOrders,
      pendingOrders,
      completedOrders
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// 3. Channels Endpoints
router.get("/channels", async (req: Request, res: Response) => {
  try {
    const channels = await prisma.confirmChannel.findMany({
      orderBy: { createdAt: "desc" }
    });
    return res.json(channels);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch channels" });
  }
});

router.post("/channels", async (req: Request, res: Response) => {
  try {
    const { channelId, title, inviteLink } = req.body;
    if (!channelId || !title) {
      return res.status(400).json({ error: "channelId and title are required" });
    }

    const channel = await prisma.confirmChannel.upsert({
      where: { channelId },
      update: { title, inviteLink: inviteLink || null },
      create: { channelId, title, inviteLink: inviteLink || null }
    });

    return res.status(201).json(channel);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create channel" });
  }
});

router.delete("/channels/:id", async (req, res) => {
  try {
    const param = req.params.id;
    const id = parseInt(param, 10);

    if (!isNaN(id)) {
      try {
        const deleted = await prisma.confirmChannel.delete({
          where: { id }
        });
        return res.json({ success: true, message: `Deleted channel with ID: ${id} (${deleted.title})` });
      } catch (e: any) {
        // Fallback to checking by channelId (in case the channelId itself is a numeric string)
      }
    }

    const deleted = await prisma.confirmChannel.delete({
      where: { channelId: param }
    });
    return res.json({ success: true, message: `Deleted channel: ${deleted.channelId} (${deleted.title})` });
  } catch (error: any) {
    console.error("Error deleting channel:", error);
    return res.status(500).json({ error: "Failed to delete channel. Make sure it exists." });
  }
});

// 4. Models Endpoints
router.get("/models", async (req: Request, res: Response) => {
  try {
    const models = await prisma.vehicleModel.findMany({
      orderBy: { createdAt: "desc" }
    });
    return res.json(models);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch models" });
  }
});

router.post("/models", async (req: Request, res: Response) => {
  try {
    const { nameUz, nameRu } = req.body;
    if (!nameUz || !nameRu) {
      return res.status(400).json({ error: "nameUz and nameRu are required" });
    }

    const model = await prisma.vehicleModel.create({
      data: { nameUz, nameRu }
    });

    return res.status(201).json(model);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create model" });
  }
});

router.delete("/models/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    await prisma.vehicleModel.delete({
      where: { id }
    });
    return res.json({ success: true, message: `Deleted model with ID: ${id}` });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to delete model" });
  }
});

router.patch("/models/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const { nameUz, nameRu } = req.body;
    if (!nameUz && !nameRu) {
      return res.status(400).json({ error: "At least one of nameUz or nameRu is required" });
    }

    const updated = await prisma.vehicleModel.update({
      where: { id },
      data: {
        ...(nameUz && { nameUz }),
        ...(nameRu && { nameRu })
      }
    });

    return res.json(updated);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update model" });
  }
});

// 5. Products Endpoints
router.get("/products", async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        model: true,
        media: true
      },
      orderBy: { createdAt: "desc" }
    });
    return res.json(products);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/products", async (req: Request, res: Response) => {
  try {
    const { modelId, nameUz, nameRu, price, descUz, descRu } = req.body;
    if (!modelId || !nameUz || !nameRu || price === undefined) {
      return res.status(400).json({ error: "modelId, nameUz, nameRu, and price are required" });
    }

    const parsedModelId = parseInt(modelId, 10);
    const parsedPrice = parseFloat(price);

    if (isNaN(parsedModelId) || isNaN(parsedPrice)) {
      return res.status(400).json({ error: "modelId and price must be valid numbers" });
    }

    const product = await prisma.product.create({
      data: {
        modelId: parsedModelId,
        nameUz,
        nameRu,
        price: parsedPrice,
        descUz: descUz || null,
        descRu: descRu || null
      },
      include: {
        model: true,
        media: true
      }
    });

    return res.status(201).json(product);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create product" });
  }
});

router.delete("/products/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    await prisma.product.delete({
      where: { id }
    });
    return res.json({ success: true, message: `Deleted product with ID: ${id}` });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to delete product" });
  }
});

router.patch("/products/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const { modelId, nameUz, nameRu, price, descUz, descRu } = req.body;

    const updateData: any = {};
    if (modelId !== undefined) {
      const parsedModelId = parseInt(modelId, 10);
      if (isNaN(parsedModelId)) return res.status(400).json({ error: "Invalid modelId" });
      updateData.modelId = parsedModelId;
    }
    if (nameUz !== undefined) updateData.nameUz = nameUz;
    if (nameRu !== undefined) updateData.nameRu = nameRu;
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice)) return res.status(400).json({ error: "Invalid price" });
      updateData.price = parsedPrice;
    }
    if (descUz !== undefined) updateData.descUz = descUz || null;
    if (descRu !== undefined) updateData.descRu = descRu || null;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { model: true, media: true }
    });

    return res.json(updated);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update product" });
  }
});


router.post("/products/:id/media", async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const { fileId, mediaType } = req.body;

    if (isNaN(productId)) return res.status(400).json({ error: "Invalid Product ID" });
    if (!fileId) return res.status(400).json({ error: "fileId is required" });

    const media = await prisma.productMedia.create({
      data: {
        productId,
        fileId,
        mediaType: mediaType === "video" ? "video" : "photo"
      }
    });

    return res.status(201).json(media);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to attach media" });
  }
});

router.delete("/media/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid Media ID" });

    await prisma.productMedia.delete({ where: { id } });
    return res.json({ success: true, message: `Deleted media with ID: ${id}` });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to delete media" });
  }
});

// File Upload Endpoint — upload a photo/video and get back a Telegram fileId
router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const UPLOAD_CHAT_ID = process.env.UPLOAD_CHAT_ID;
    if (!UPLOAD_CHAT_ID) {
      return res.status(500).json({
        error: "UPLOAD_CHAT_ID is not configured. Please set it in your .env file (your Telegram user ID or a private group chat ID)."
      });
    }

    const mimeType = req.file.mimetype;
    const isVideo = mimeType.startsWith("video/");
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;

    let fileId: string;
    let mediaType: string;

    if (isVideo) {
      // Send as video
      const sent = await bot.telegram.sendVideo(UPLOAD_CHAT_ID, {
        source: fileBuffer,
        filename: fileName
      });
      const video = sent.video;
      if (!video) throw new Error("Telegram did not return video file info");
      fileId = video.file_id;
      mediaType = "video";
    } else {
      // Send as photo
      const sent = await bot.telegram.sendPhoto(UPLOAD_CHAT_ID, {
        source: fileBuffer,
        filename: fileName
      });
      const photos = sent.photo;
      if (!photos || photos.length === 0) throw new Error("Telegram did not return photo file info");
      // Pick the highest-resolution version
      fileId = photos[photos.length - 1].file_id;
      mediaType = "photo";
    }

    return res.json({ success: true, fileId, mediaType });
  } catch (error: any) {
    console.error("File upload error:", error);
    return res.status(500).json({ error: error.message || "File upload failed" });
  }
});

// 6. Users Endpoints (with BigInt safety)
router.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await prisma.telUser.findMany({
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    });

    // Safeguard for BigInt serialization in JSON
    const serializedUsers = users.map((user) => ({
      id: user.id.toString(),
      username: user.username,
      language: user.language,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      customer: user.customer ? {
        id: user.customer.id,
        userId: user.customer.userId.toString(),
        fullName: user.customer.fullName,
        phoneNumber: user.customer.phoneNumber,
        createdAt: user.customer.createdAt,
        updatedAt: user.customer.updatedAt
      } : null
    }));

    return res.json(serializedUsers);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/users/:id/toggle-admin", async (req: Request, res: Response) => {
  try {
    const idVal = req.params.id;
    let userId: bigint;
    try {
      userId = BigInt(idVal);
    } catch {
      return res.status(400).json({ error: "Invalid User ID format" });
    }

    const user = await prisma.telUser.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await prisma.telUser.update({
      where: { id: userId },
      data: { isAdmin: !user.isAdmin }
    });

    return res.json({
      success: true,
      userId: updatedUser.id.toString(),
      isAdmin: updatedUser.isAdmin
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to toggle admin status" });
  }
});

// ======================================================
// 7. Orders Endpoints
// ======================================================

router.get("/orders", async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const where: any = {};

    if (status && typeof status === "string" && status !== "ALL") {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: { include: { model: true } }
          }
        },
        user: true
      },
      orderBy: { createdAt: "desc" }
    });

    // Apply search filter (fullName, phoneNumber, product names)
    const filtered = search
      ? orders.filter((o) => {
          const q = (search as string).toLowerCase();
          const productMatch = o.items.some((item: any) => 
            item.product.nameUz.toLowerCase().includes(q) ||
            item.product.nameRu.toLowerCase().includes(q)
          );
          return (
            o.fullName.toLowerCase().includes(q) ||
            o.phoneNumber.toLowerCase().includes(q) ||
            productMatch ||
            o.id.toString().includes(q)
          );
        })
      : orders;

    // Convert BigInt to string for JSON serialization
    const serialized = filtered.map((order) => ({
      ...order,
      id: order.id.toString(),
      userId: order.userId ? order.userId.toString() : null,
      user: order.user ? {
        ...order.user,
        id: order.user.id.toString()
      } : null,
      items: order.items.map((item: any) => ({
        ...item,
        id: item.id.toString(),
        orderId: item.orderId.toString(),
        productId: item.productId.toString(),
        product: {
          ...item.product,
          id: item.product.id.toString(),
          modelId: item.product.modelId.toString(),
          model: {
            ...item.product.model,
            id: item.product.model.id.toString()
          }
        }
      }))
    }));

    return res.json(serialized);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.get("/orders/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { include: { model: true } }
          }
        },
        user: true,
        history: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Convert BigInt to string for JSON serialization
    const serialized = {
      ...order,
      id: order.id.toString(),
      userId: order.userId ? order.userId.toString() : null,
      user: order.user ? {
        ...order.user,
        id: order.user.id.toString()
      } : null,
      items: order.items.map((item: any) => ({
        ...item,
        id: item.id.toString(),
        orderId: item.orderId.toString(),
        productId: item.productId.toString(),
        product: {
          ...item.product,
          id: item.product.id.toString(),
          modelId: item.product.modelId.toString(),
          model: {
            ...item.product.model,
            id: item.product.model.id.toString()
          }
        }
      })),
      history: order.history.map((h: any) => ({
        ...h,
        orderId: h.orderId.toString()
      }))
    };

    return res.json(serialized);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch order details" });
  }
});

router.patch("/orders/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const { status } = req.body;
    const validStatuses = ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"] as const;
    if (!status || !validStatuses.includes(status as any)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(", ")}` });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { include: { model: true } }
          }
        },
        user: true
      }
    });

    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    const oldStatus = existingOrder.status;
    if (oldStatus !== status) {
      // Record order history
      await prisma.orderHistory.create({
        data: {
          orderId: id,
          oldStatus: oldStatus as any,
          newStatus: status as any,
          changedBy: "ADMIN_PANEL",
          changedById: "admin",
          notes: `Status changed from ${oldStatus} to ${status} via Admin Panel`
        }
      });

      // Update Telegram message if exists
      if (existingOrder.telegramMessageId) {
        try {
          const ADMIN_CHAT_ID = process.env.UPLOAD_CHAT_ID;
          if (ADMIN_CHAT_ID) {
            const updatedOrder = await prisma.order.findUnique({
              where: { id },
              include: {
                items: {
                  include: {
                    product: { include: { model: true } }
                  }
                },
                user: true
              }
            });

            if (updatedOrder) {
              const date = new Date(updatedOrder.createdAt).toLocaleString("uz-UZ", {
                timeZone: "Asia/Tashkent",
              });

              const updatedDate = new Date().toLocaleString("uz-UZ", {
                timeZone: "Asia/Tashkent",
              });

              let productsText = "";
              let totalItems = 0;
              let totalProducts = 0;

              if (updatedOrder.items && updatedOrder.items.length > 0) {
                totalProducts = updatedOrder.items.length;
                updatedOrder.items.forEach((item: any) => {
                  totalItems += item.quantity;
                  productsText += `📦 ${item.product.nameUz} / ${item.product.nameRu}\n`;
                  productsText += `   └ Model: ${item.product.model.nameUz} / ${item.product.model.nameRu}\n`;
                  productsText += `   └ Miqdor: ${item.quantity} × $${item.price ?? "N/A"}\n\n`;
                });
              }

              const text =
                `🛒 *Buyurtma / Заказ #${updatedOrder.id}*\n\n` +
                `👤 Mijoz: ${updatedOrder.fullName}\n` +
                `🔖 Username: @${updatedOrder.user?.username ?? "—"} (ID: ${updatedOrder.user?.id})\n` +
                `📞 Telefon: ${updatedOrder.phoneNumber}\n\n` +
                productsText +
                `📊 Jami mahsulotlar: ${totalItems}\n` +
                `� Mahsulotlar soni: ${totalProducts}\n` +
                `� Jami narx: $${updatedOrder.totalAmount?.toLocaleString() ?? "N/A"}\n` +
                `📝 Izoh: ${updatedOrder.notes ?? "—"}\n` +
                `📅 Sana: ${date}\n\n` +
                `📊 *Status: ${status}*\n` +
                `🔄 Updated: ${updatedDate}\n` +
                `👤 By: Admin (Panel)\n\n` +
                `🔗 Admin: http://localhost:8000/admin/`;

              await bot.telegram.editMessageText(
                ADMIN_CHAT_ID,
                parseInt(existingOrder.telegramMessageId),
                undefined,
                text,
                {
                  parse_mode: "Markdown"
                }
              );
              console.log(`[ORDER] Telegram message updated for order #${id}`);
            }
          }
        } catch (error) {
          console.error("[ORDER] Failed to update Telegram message:", error);
        }
      }

      await trackOrderStatusUpdate({
        userId: existingOrder.userId,
        username: null,
        orderId: id,
        oldStatus: oldStatus,
        newStatus: status,
        source: Source.WEBSITE,
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: {
            product: { include: { model: true } }
          }
        },
        user: true
      }
    });

    // Send admin notifications for status changes
    if (oldStatus !== status) {
      if (status === "CANCELLED") {
        notificationService.notifyOrderCancelled(updated).catch((err) => {
          console.error("Failed to send order cancelled notification:", err);
        });
      } else if (status === "COMPLETED") {
        notificationService.notifyOrderCompleted(updated).catch((err) => {
          console.error("Failed to send order completed notification:", err);
        });
      } else {
        notificationService.notifyOrderStatusChange(updated, oldStatus, status).catch((err) => {
          console.error("Failed to send order status change notification:", err);
        });
      }
    }

    // Convert BigInt to string for JSON serialization
    const serialized = {
      ...updated,
      id: updated.id.toString(),
      userId: updated.userId ? updated.userId.toString() : null,
      user: updated.user ? {
        ...updated.user,
        id: updated.user.id.toString()
      } : null,
      items: updated.items.map((item: any) => ({
        ...item,
        id: item.id.toString(),
        orderId: item.orderId.toString(),
        productId: item.productId.toString(),
        product: {
          ...item.product,
          id: item.product.id.toString(),
          modelId: item.product.modelId.toString(),
          model: {
            ...item.product.model,
            id: item.product.model.id.toString()
          }
        }
      }))
    };

    return res.json(serialized);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update order status" });
  }
});

router.delete("/orders/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    await prisma.order.delete({ where: { id } });
    return res.json({ success: true, message: `Order #${id} deleted` });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to delete order" });
  }
});

// ======================================================
// 8. Analytics Endpoints
// ======================================================

// Activity Feed - Get all activities with pagination and filters
router.get("/analytics/activity", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const {
      eventType,
      userId,
      productId,
      source,
      startDate,
      endDate,
    } = req.query;

    const where: any = {};

    if (eventType && typeof eventType === "string") {
      where.eventType = eventType;
    }

    if (userId && typeof userId === "string") {
      where.userId = BigInt(userId);
    }

    if (productId && typeof productId === "string") {
      where.eventData = {
        contains: `"productId":${parseInt(productId, 10)}`,
      };
    }

    if (source && typeof source === "string") {
      where.source = source;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const activities = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    const total = await prisma.activityLog.count({ where });

    // Parse eventData JSON for each activity
    const parsedActivities = activities.map((activity) => ({
      ...activity,
      userId: activity.userId?.toString(),
      eventData: JSON.parse(activity.eventData),
    }));

    return res.json({
      activities: parsedActivities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch activity feed" });
  }
});

// Dashboard Statistics
router.get("/analytics/dashboard", async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Active users today
    const activeUsersToday = await prisma.activityLog.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: todayStart },
        userId: { not: null },
      },
    });

    // Active users this week
    const activeUsersWeek = await prisma.activityLog.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: weekStart },
        userId: { not: null },
      },
    });

    // Total product views
    const totalProductViews = await prisma.activityLog.count({
      where: { eventType: "PRODUCT_VIEW" },
    });

    // Total button clicks
    const totalButtonClicks = await prisma.activityLog.count({
      where: { eventType: "BUTTON_CLICK" },
    });

    // Total orders
    const totalOrders = await prisma.activityLog.count({
      where: { eventType: "ORDER" },
    });

    // Top viewed products
    const productViews = await prisma.activityLog.findMany({
      where: { eventType: "PRODUCT_VIEW" },
      orderBy: { createdAt: "desc" },
    });

    const productViewCounts: Record<string, { count: number; name: string }> = {};
    productViews.forEach((activity) => {
      const data = JSON.parse(activity.eventData);
      const key = data.productId;
      if (key) {
        if (!productViewCounts[key]) {
          productViewCounts[key] = { count: 0, name: data.productName || "Unknown" };
        }
        productViewCounts[key].count++;
      }
    });

    const topViewedProducts = Object.entries(productViewCounts)
      .map(([productId, data]) => ({
        productId: parseInt(productId),
        productName: data.name,
        views: data.count,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Top ordered products
    const orderActivities = await prisma.activityLog.findMany({
      where: { eventType: "ORDER" },
      orderBy: { createdAt: "desc" },
    });

    const productOrderCounts: Record<string, { count: number; name: string }> = {};
    orderActivities.forEach((activity) => {
      const data = JSON.parse(activity.eventData);
      const key = data.productId;
      if (key) {
        if (!productOrderCounts[key]) {
          productOrderCounts[key] = { count: 0, name: data.productName || "Unknown" };
        }
        productOrderCounts[key].count++;
      }
    });

    const topOrderedProducts = Object.entries(productOrderCounts)
      .map(([productId, data]) => ({
        productId: parseInt(productId),
        productName: data.name,
        orders: data.count,
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    // Most active users
    const userActivities = await prisma.activityLog.groupBy({
      by: ["userId", "username"],
      where: { userId: { not: null } },
      _count: { userId: true },
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    });

    const mostActiveUsers = userActivities.map((user) => ({
      userId: user.userId?.toString(),
      username: user.username,
      activityCount: user._count.userId,
    }));

    return res.json({
      activeUsersToday: activeUsersToday.length,
      activeUsersWeek: activeUsersWeek.length,
      totalProductViews,
      totalButtonClicks,
      totalOrders,
      topViewedProducts,
      topOrderedProducts,
      mostActiveUsers,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch dashboard statistics" });
  }
});

// User Profile Analytics
router.get("/analytics/user/:userId", async (req: Request, res: Response) => {
  try {
    const userId = BigInt(req.params.userId);

    const activities = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const productViews = activities.filter((a) => a.eventType === "PRODUCT_VIEW");
    const buttonClicks = activities.filter((a) => a.eventType === "BUTTON_CLICK");
    const orders = activities.filter((a) => a.eventType === "ORDER");

    // Most viewed products
    const productViewCounts: Record<string, { count: number; name: string }> = {};
    productViews.forEach((activity) => {
      const data = JSON.parse(activity.eventData);
      const key = data.productId;
      if (key) {
        if (!productViewCounts[key]) {
          productViewCounts[key] = { count: 0, name: data.productName || "Unknown" };
        }
        productViewCounts[key].count++;
      }
    });

    const mostViewedProducts = Object.entries(productViewCounts)
      .map(([productId, data]) => ({
        productId: parseInt(productId),
        productName: data.name,
        views: data.count,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Most ordered products
    const productOrderCounts: Record<string, { count: number; name: string }> = {};
    orders.forEach((activity) => {
      const data = JSON.parse(activity.eventData);
      const key = data.productId;
      if (key) {
        if (!productOrderCounts[key]) {
          productOrderCounts[key] = { count: 0, name: data.productName || "Unknown" };
        }
        productOrderCounts[key].count++;
      }
    });

    const mostOrderedProducts = Object.entries(productOrderCounts)
      .map(([productId, data]) => ({
        productId: parseInt(productId),
        productName: data.name,
        orders: data.count,
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    const lastActivity = activities.length > 0 ? activities[0].createdAt : null;

    return res.json({
      totalProductViews: productViews.length,
      totalButtonClicks: buttonClicks.length,
      totalOrders: orders.length,
      lastActivity,
      mostViewedProducts,
      mostOrderedProducts,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch user analytics" });
  }
});

// Product Analytics
router.get("/analytics/product/:productId", async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.productId, 10);

    const activities = await prisma.activityLog.findMany({
      where: {
        eventType: "PRODUCT_VIEW",
        eventData: {
          contains: `"productId":${productId}`,
        },
      },
    });

    const uniqueViewers = new Set(activities.map((a) => a.userId?.toString())).size;

    const orderClickActivities = await prisma.activityLog.findMany({
      where: {
        eventType: "BUTTON_CLICK",
        eventData: {
          contains: `"buttonName":"Order Product"`,
        },
      },
    });

    const orderClicksForProduct = orderClickActivities.filter((a) => {
      const data = JSON.parse(a.eventData);
      return data.productId === productId;
    });

    const orderActivities = await prisma.activityLog.findMany({
      where: {
        eventType: "ORDER",
        eventData: {
          contains: `"productId":${productId}`,
        },
      },
    });

    const completedOrders = await prisma.order.count({
      where: {
        items: {
          some: {
            productId
          }
        },
        status: "COMPLETED" as any,
      },
    });

    const conversionRate = activities.length > 0
      ? ((completedOrders / activities.length) * 100).toFixed(2)
      : "0.00";

    return res.json({
      productId,
      totalViews: activities.length,
      uniqueViewers,
      orderClicks: orderClicksForProduct.length,
      totalOrders: orderActivities.length,
      completedOrders,
      conversionRate: parseFloat(conversionRate),
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch product analytics" });
  }
});

// Notification configuration endpoints
router.get("/notifications/config", async (req: Request, res: Response) => {
  try {
    const configs = await prisma.adminConfig.findMany();
    return res.json(configs);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch notification config" });
  }
});

router.put("/notifications/config", async (req: Request, res: Response) => {
  try {
    const { key, value, description } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: "key and value are required" });
    }

    await notificationService.setAdminConfig(key, value, description);
    return res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update notification config" });
  }
});

router.get("/notifications/history", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await notificationService.getNotificationHistory(limit);
    return res.json(history);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch notification history" });
  }
});

router.get("/notifications/unread-count", async (req: Request, res: Response) => {
  try {
    const count = await notificationService.getUnreadNotificationCount();
    return res.json({ count });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

export default router;
