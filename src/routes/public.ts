import express from "express";
import { PrismaClient } from "@prisma/client";
import { notificationService } from "../services/notificationService";

const prisma = new PrismaClient();
const router = express.Router();

// Get all vehicle models (categories)
router.get("/categories", async (req, res) => {
  try {
    const language = req.query.language as string || "uz";
    const models = await prisma.vehicleModel.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    const formattedModels = models.map((model: { id: any; nameRu: any; nameUz: any; _count: { products: any; }; createdAt: any; }) => ({
      id: model.id,
      name: language === "ru" ? model.nameRu : model.nameUz,
      nameUz: model.nameUz,
      nameRu: model.nameRu,
      productCount: model._count.products,
      createdAt: model.createdAt
    }));

    res.json(formattedModels);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Get products with filtering, search, and pagination
router.get("/products", async (req, res) => {
  try {
    const {
      page = "1",
      limit = "20",
      categoryId,
      search,
      language = "uz",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    
    if (categoryId) {
      where.modelId = parseInt(categoryId as string);
    }

    if (search) {
      where.OR = [
        { nameUz: { contains: search as string, mode: "insensitive" } },
        { nameRu: { contains: search as string, mode: "insensitive" } },
        { descUz: { contains: search as string, mode: "insensitive" } },
        { descRu: { contains: search as string, mode: "insensitive" } }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy as string]: sortOrder as string },
        include: {
          model: true,
          media: {
            orderBy: { createdAt: "asc" }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    const formattedProducts = products.map((product: { id: any; nameRu: any; nameUz: any; descRu: any; descUz: any; price: any; model: { id: any; nameRu: any; nameUz: any; }; media: any[]; createdAt: any; }) => ({
      id: product.id,
      name: language === "ru" ? product.nameRu : product.nameUz,
      nameUz: product.nameUz,
      nameRu: product.nameRu,
      description: language === "ru" ? product.descRu : product.descUz,
      descriptionUz: product.descUz,
      descriptionRu: product.descRu,
      price: product.price,
      model: {
        id: product.model.id,
        name: language === "ru" ? product.model.nameRu : product.model.nameUz
      },
      media: product.media.map((m: { id: any; fileId: any; mediaType: any; }) => ({
        id: m.id,
        fileId: m.fileId,
        type: m.mediaType
      })),
      createdAt: product.createdAt
    }));

    res.json({
      products: formattedProducts,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Get single product details
router.get("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const language = req.query.language as string || "uz";

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        model: true,
        media: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const formattedProduct = {
      id: product.id,
      name: language === "ru" ? product.nameRu : product.nameUz,
      nameUz: product.nameUz,
      nameRu: product.nameRu,
      description: language === "ru" ? product.descRu : product.descUz,
      descriptionUz: product.descUz,
      descriptionRu: product.descRu,
      price: product.price,
      model: {
        id: product.model.id,
        name: language === "ru" ? product.model.nameRu : product.model.nameUz,
        nameUz: product.model.nameUz,
        nameRu: product.model.nameRu
      },
      media: product.media.map((m: { id: any; fileId: any; mediaType: any; }) => ({
        id: m.id,
        fileId: m.fileId,
        type: m.mediaType
      })),
      createdAt: product.createdAt
    };

    res.json(formattedProduct);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// Get featured products
router.get("/products/featured", async (req, res) => {
  try {
    const language = req.query.language as string || "uz";
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const products = await prisma.product.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        model: true,
        media: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    const formattedProducts = products.map((product: { id: any; nameRu: any; nameUz: any; descRu: any; descUz: any; price: any; model: { id: any; nameRu: any; nameUz: any; }; media: any[]; createdAt: any; }) => ({
      id: product.id,
      name: language === "ru" ? product.nameRu : product.nameUz,
      nameUz: product.nameUz,
      nameRu: product.nameRu,
      description: language === "ru" ? product.descRu : product.descUz,
      descriptionUz: product.descUz,
      descriptionRu: product.descRu,
      price: product.price,
      model: {
        id: product.model.id,
        name: language === "ru" ? product.model.nameRu : product.model.nameUz
      },
      media: product.media.map((m: { id: any; fileId: any; mediaType: any; }) => ({
        id: m.id,
        fileId: m.fileId,
        type: m.mediaType
      })),
      createdAt: product.createdAt
    }));

    res.json(formattedProducts);
  } catch (error) {
    console.error("Error fetching featured products:", error);
    res.status(500).json({ error: "Failed to fetch featured products" });
  }
});

// Create order (checkout)
router.post("/orders", async (req, res) => {
  try {
    const {
      userId,
      items,
      fullName,
      phoneNumber,
      address,
      notes,
      language = "uz"
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order must contain at least one item" });
    }

    if (!fullName || !phoneNumber || !address) {
      return res.status(400).json({ error: "Full name, phone number, and address are required" });
    }

    // Calculate total amount and validate products
    let totalAmount = 0;
    const orderItemsData = await Promise.all(
      items.map(async (item: any) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`Product with id ${item.productId} not found`);
        }

        const itemTotal = (product.price || 0) * (item.quantity || 1);
        totalAmount += itemTotal;

        return {
          productId: item.productId,
          quantity: item.quantity || 1,
          price: product.price
        };
      })
    );

    // Create a single order with multiple items (guest orders allowed)
    const order = await prisma.order.create({
      data: {
        userId: userId ? BigInt(userId) : null,
        fullName,
        phoneNumber,
        address,
        totalAmount,
        notes: notes || null,
        status: "PENDING" as any,
        source: "WEBSITE"
      }
    });

    // Create order items
    await prisma.orderItem.createMany({
      data: orderItemsData.map(item => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }))
    });

    // Update or create customer record (only for logged-in users)
    if (userId) {
      await prisma.customer.upsert({
        where: { userId: BigInt(userId) },
        update: {
          fullName,
          phoneNumber,
          address
        },
        create: {
          userId: BigInt(userId),
          fullName,
          phoneNumber,
          address
        }
      });
    }

    res.status(201).json({
      success: true,
      orderId: order.id,
      message: language === "ru" ? "Заказ успешно создан" : "Buyurtma muvaffaqiyatli yaratildi"
    });

    // Send admin notification for the order
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { 
        user: true,
        items: {
          include: {
            product: {
              include: {
                model: true
              }
            }
          }
        }
      }
    });
    if (fullOrder) {
      notificationService.notifyNewOrder(fullOrder).catch((err) => {
        console.error("Failed to send new order notification:", err);
      });
    }
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Get user orders
router.get("/orders/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const language = req.query.language as string || "uz";

    const orders = await prisma.order.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              include: {
                model: true
              }
            }
          }
        }
      }
    });

    const formattedOrders = orders.map((order: any) => ({
      id: order.id,
      fullName: order.fullName,
      phoneNumber: order.phoneNumber,
      totalAmount: order.totalAmount,
      status: order.status,
      notes: order.notes,
      createdAt: order.createdAt,
      items: order.items.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        product: {
          id: item.product.id,
          name: language === "ru" ? item.product.nameRu : item.product.nameUz,
          nameUz: item.product.nameUz,
          nameRu: item.product.nameRu,
          price: item.product.price,
          model: {
            id: item.product.model.id,
            name: language === "ru" ? item.product.model.nameRu : item.product.model.nameUz
          }
        }
      }))
    }));

    res.json(formattedOrders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Get single order details
router.get("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const language = req.query.language as string || "uz";

    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          include: {
            product: {
              include: {
                model: true,
                media: true
              }
            }
          }
        },
        user: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const formattedOrder = {
      id: order.id,
      fullName: order.fullName,
      phoneNumber: order.phoneNumber,
      totalAmount: order.totalAmount,
      status: order.status,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        product: {
          id: item.product.id,
          name: language === "ru" ? item.product.nameRu : item.product.nameUz,
          nameUz: item.product.nameUz,
          nameRu: item.product.nameRu,
          description: language === "ru" ? item.product.descRu : item.product.descUz,
          descriptionUz: item.product.descUz,
          descriptionRu: item.product.descRu,
          price: item.product.price,
          model: {
            id: item.product.model.id,
            name: language === "ru" ? item.product.model.nameRu : item.product.model.nameUz,
            nameUz: item.product.model.nameUz,
            nameRu: item.product.model.nameRu
          },
          media: item.product.media.map((m: { id: any; fileId: any; mediaType: any; }) => ({
            id: m.id,
            fileId: m.fileId,
            type: m.mediaType
          }))
        }
      }))
    };

    res.json(formattedOrder);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// Favorites routes
router.post("/favorites", async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ error: "userId and productId are required" });
    }

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: BigInt(userId),
          productId
        }
      }
    });

    if (existing) {
      // Remove if already favorited (toggle behavior)
      await prisma.favorite.delete({
        where: { id: existing.id }
      });
      return res.json({ success: true, favorited: false });
    }

    // Add to favorites
    await prisma.favorite.create({
      data: {
        userId: BigInt(userId),
        productId
      }
    });

    res.json({ success: true, favorited: true });
  } catch (error) {
    console.error("Error toggling favorite:", error);
    res.status(500).json({ error: "Failed to toggle favorite" });
  }
});

router.get("/favorites/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const language = req.query.language as string || "uz";

    const favorites = await prisma.favorite.findMany({
      where: { userId: BigInt(userId) },
      include: {
        product: {
          include: {
            model: true,
            media: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const formattedFavorites = favorites.map((fav: any) => ({
      id: fav.id,
      productId: fav.productId,
      createdAt: fav.createdAt,
      product: {
        id: fav.product.id,
        name: language === "ru" ? fav.product.nameRu : fav.product.nameUz,
        nameUz: fav.product.nameUz,
        nameRu: fav.product.nameRu,
        description: language === "ru" ? fav.product.descRu : fav.product.descUz,
        descriptionUz: fav.product.descUz,
        descriptionRu: fav.product.descRu,
        price: fav.product.price,
        model: {
          id: fav.product.model.id,
          name: language === "ru" ? fav.product.model.nameRu : fav.product.model.nameUz,
          nameUz: fav.product.model.nameUz,
          nameRu: fav.product.model.nameRu
        },
        media: fav.product.media.map((m: { id: any; fileId: any; mediaType: any; }) => ({
          id: m.id,
          fileId: m.fileId,
          type: m.mediaType
        }))
      }
    }));

    res.json(formattedFavorites);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

router.delete("/favorites/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.favorite.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
});

// Search products
router.get("/search", async (req, res) => {
  try {
    const { q, language = "uz", limit = "20" } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Search query is required" });
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { nameUz: { contains: q } },
          { nameRu: { contains: q } },
          { descUz: { contains: q } },
          { descRu: { contains: q } }
        ]
      },
      take: parseInt(limit as string),
      include: {
        model: true,
        media: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    const formattedProducts = products.map((product: { id: any; nameRu: any; nameUz: any; descRu: any; descUz: any; price: any; model: { id: any; nameRu: any; nameUz: any; }; media: any[]; createdAt: any; }) => ({
      id: product.id,
      name: language === "ru" ? product.nameRu : product.nameUz,
      nameUz: product.nameUz,
      nameRu: product.nameRu,
      description: language === "ru" ? product.descRu : product.descUz,
      descriptionUz: product.descUz,
      descriptionRu: product.descRu,
      price: product.price,
      model: {
        id: product.model.id,
        name: language === "ru" ? product.model.nameRu : product.model.nameUz
      },
      media: product.media.map((m: { id: any; fileId: any; mediaType: any; }) => ({
        id: m.id,
        fileId: m.fileId,
        type: m.mediaType
      })),
      createdAt: product.createdAt
    }));

    res.json(formattedProducts);
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ error: "Failed to search products" });
  }
});

// Get user profile
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.telUser.findUnique({
      where: { id: BigInt(userId) },
      include: {
        customer: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const formattedUser = {
      id: user.id.toString(),
      username: user.username,
      language: user.language,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      customer: user.customer ? {
        fullName: user.customer.fullName,
        phoneNumber: user.customer.phoneNumber
      } : null
    };

    res.json(formattedUser);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Update user profile
router.put("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, phoneNumber, language } = req.body;

    // Update customer record
    if (fullName && phoneNumber) {
      await prisma.customer.upsert({
        where: { userId: BigInt(userId) },
        update: {
          fullName,
          phoneNumber
        },
        create: {
          userId: BigInt(userId),
          fullName,
          phoneNumber
        }
      });
    }

    // Update user language if provided
    if (language) {
      await prisma.telUser.update({
        where: { id: BigInt(userId) },
        data: { language }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Failed to update user profile" });
  }
});

export default router;