import { Telegraf, Markup } from "telegraf";
import { MyContext } from "../context";
import { prisma } from "../../config/db";
import { trackOrder, trackButtonClick, trackCommand, Source } from "../../services/activityTracker";

// ─── Shared helper: send admin notification ────────────────────────────────
export async function notifyAdmin(
  bot: Telegraf<MyContext>,
  order: {
    id: number;
    fullName: string;
    phoneNumber: string;
    totalAmount: number | null;
    notes?: string | null;
    createdAt: Date;
    items?: Array<{
      quantity: number;
      price: number | null;
      product: { nameUz: string; nameRu: string; model: { nameUz: string; nameRu: string } };
    }>;
  },
  user: { id: bigint; username: string | null }
) {
  const ADMIN_CHAT_ID = process.env.UPLOAD_CHAT_ID;
  if (!ADMIN_CHAT_ID) return;

  const date = new Date(order.createdAt).toLocaleString("uz-UZ", {
    timeZone: "Asia/Tashkent",
  });

  let productsText = "";
  let totalItems = 0;
  let totalProducts = 0;

  if (order.items && order.items.length > 0) {
    totalProducts = order.items.length;
    order.items.forEach((item) => {
      totalItems += item.quantity;
      productsText += `📦 ${item.product.nameUz} / ${item.product.nameRu}\n`;
      productsText += `   └ Model: ${item.product.model.nameUz} / ${item.product.model.nameRu}\n`;
      productsText += `   └ Miqdor: ${item.quantity} × $${item.price ?? "N/A"}\n\n`;
    });
  }

  const text =
    `🛒 *Yangi buyurtma / Новый заказ!*\n\n` +
    `🆔 Order: #${order.id}\n` +
    `👤 Mijoz: ${order.fullName}\n` +
    `🔖 Username: @${user.username ?? "—"} (ID: ${user.id})\n` +
    `📞 Telefon: ${order.phoneNumber}\n\n` +
    productsText +
    `� Jami mahsulotlar: ${totalItems}\n` +
    `📦 Mahsulotlar soni: ${totalProducts}\n` +
    `💰 Jami narx: $${order.totalAmount?.toLocaleString() ?? "N/A"}\n` +
    `📝 Izoh: ${order.notes ?? "—"}\n` +
    `📅 Sana: ${date}\n\n` +
    `🔗 Admin: http://localhost:8000/admin/`;

  try {
    const message = await bot.telegram.sendMessage(ADMIN_CHAT_ID, text, {
      parse_mode: "Markdown",
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Accept", `order_accept_${order.id}`),
          Markup.button.callback("🚚 Processing", `order_processing_${order.id}`)
        ],
        [
          Markup.button.callback("✔️ Complete", `order_complete_${order.id}`),
          Markup.button.callback("❌ Cancel", `order_cancel_${order.id}`)
        ]
      ]).reply_markup
    });

    // Store the Telegram message ID for later editing
    await prisma.order.update({
      where: { id: order.id },
      data: { telegramMessageId: message.message_id.toString() }
    });
  } catch (e) {
    console.error("[ORDER] Admin notification failed:", e);
  }
}

// ─── Shared helper: create order in DB + notify ────────────────────────────
async function createOrder(
  bot: Telegraf<MyContext>,
  ctx: MyContext,
  productId: number,
  fullName: string,
  phoneNumber: string,
  quantity: number,
  notes?: string
) {
  const userId = ctx.dbUser!.id;

  // Duplicate guard - check for recent pending orders with same product
  const existing = await prisma.order.findFirst({
    where: { 
      userId, 
      status: "PENDING" as any,
      createdAt: {
        gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      }
    },
    include: {
      items: {
        where: { productId }
      }
    }
  });
  if (existing && existing.items.length > 0) {
    await ctx.reply(ctx.t("order_duplicate"));
    return;
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { model: true },
  });
  if (!product) {
    await ctx.reply("❌ Product not found.");
    return;
  }

  const totalAmount = (product.price || 0) * quantity;

  const order = await prisma.order.create({
    data: {
      userId,
      fullName,
      phoneNumber,
      totalAmount,
      notes: notes || null,
      status: "PENDING" as any,
      source: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup" ? "TELEGRAM_GROUP" : "TELEGRAM_BOT",
      items: {
        create: {
          productId,
          quantity,
          price: product.price
        }
      }
    },
  });

  // Track order
  const productName = ctx.dbUser?.language === "ru" ? product.nameRu : product.nameUz;
  await trackOrder({
    userId: userId,
    username: ctx.from?.username,
    orderId: order.id,
    productId: productId,
    productName: productName,
    quantity: quantity,
    source: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup" ? Source.TELEGRAM_GROUP : Source.TELEGRAM_BOT,
  });

  await ctx.reply(ctx.t("order_success", { orderId: order.id.toString() }));

  // Fetch order with items for notification
  const orderWithItems = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: {
        include: {
          product: {
            include: { model: true }
          }
        }
      }
    }
  });

  await notifyAdmin(bot, orderWithItems!, {
    id: userId,
    username: ctx.from?.username ?? null,
  });

  // Clear order session state
  if (ctx.session) {
    ctx.session.step = "MAIN_MENU";
    ctx.session.orderProductId = undefined;
    ctx.session.orderFullName = undefined;
    ctx.session.orderPhone = undefined;
    ctx.session.orderQuantity = undefined;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────
export function registerOrderHandlers(bot: Telegraf<MyContext>) {

  // ── 1. Inline button "🛒 Order" on product card ─────────────────────────
  bot.action(/^order_prod_(\d+)$/, async (ctx) => {
    const productId = parseInt(ctx.match[1], 10);
    await ctx.answerCbQuery();

    await trackButtonClick({
      userId: ctx.dbUser?.id,
      username: ctx.from?.username,
      buttonName: "Order Product",
      productId: productId,
      source: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup" ? Source.TELEGRAM_GROUP : Source.TELEGRAM_BOT,
    });

    if (!ctx.dbUser?.customer) {
      await ctx.reply(ctx.t("order_not_registered"));
      return;
    }

    const { fullName, phoneNumber } = ctx.dbUser.customer;
    await createOrder(bot, ctx, productId, fullName, phoneNumber, 1);
  });

  // ── 2. /buy [id] and /order [id] commands ────────────────────────────────
  const orderCommandHandler = async (ctx: MyContext) => {
    const command = (ctx.message as any)?.text?.split(" ")[0] || "/order";
    await trackCommand({
      userId: ctx.dbUser?.id,
      username: ctx.from?.username,
      command: command,
      source: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup" ? Source.TELEGRAM_GROUP : Source.TELEGRAM_BOT,
    });

    // In a group: redirect to private chat with a button
    const isGroup = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";

    if (isGroup) {
      const botInfo = await bot.telegram.getMe();
      const productIdArg = (ctx.message as any)?.text?.split(" ")[1];
      const deepLink = productIdArg
        ? `https://t.me/${botInfo.username}?start=order_${productIdArg}`
        : `https://t.me/${botInfo.username}?start=order`;

      await ctx.reply(
        ctx.t("order_group_prompt"),
        Markup.inlineKeyboard([
          [Markup.button.url(ctx.t("order_btn_complete"), deepLink)],
        ])
      );
      return;
    }

    // Private chat: check registration
    if (!ctx.dbUser?.customer) {
      await ctx.reply(ctx.t("order_not_registered"));
      return;
    }

    // Parse product ID from command argument e.g. /buy 5
    const text = (ctx.message as any)?.text ?? "";
    const parts = text.trim().split(/\s+/);
    const productIdArg = parts[1];

    if (productIdArg) {
      const productId = parseInt(productIdArg, 10);
      if (isNaN(productId)) {
        await ctx.reply("❌ Invalid product ID. Use /buy <number> or just /buy");
        return;
      }

      // Verify product exists
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { model: true },
      });
      if (!product) {
        await ctx.reply(`❌ Product #${productId} not found.`);
        return;
      }

      const productName = ctx.dbUser.language === "ru" ? product.nameRu : product.nameUz;
      const modelName = ctx.dbUser.language === "ru" ? product.model.nameRu : product.model.nameUz;

      // Start quantity step directly (skip name/phone — already registered)
      if (!ctx.session) ctx.session = {};
      ctx.session.orderProductId = productId;
      ctx.session.step = "ORDER_ENTER_QUANTITY";

      await ctx.reply(
        `📦 *${productName}* (${modelName})\n💰 $${product.price ?? "N/A"}\n\n` +
        ctx.t("order_enter_quantity"),
        { parse_mode: "Markdown" }
      );
    } else {
      // No product ID — show product selection list
      const products = await prisma.product.findMany({
        include: { model: true },
        orderBy: { id: "asc" },
        take: 20,
      });

      if (products.length === 0) {
        await ctx.reply(ctx.t("no_products"));
        return;
      }

      const buttons = products.map((p) => {
        const name = ctx.dbUser?.language === "ru" ? p.nameRu : p.nameUz;
        const model = ctx.dbUser?.language === "ru" ? p.model.nameRu : p.model.nameUz;
        return [Markup.button.callback(
          `${name} — ${model} ($${p.price ?? "?"})`,
          `order_prod_select_${p.id}`
        )];
      });

      if (!ctx.session) ctx.session = {};
      ctx.session.step = "ORDER_SELECT_PRODUCT";

      await ctx.reply(ctx.t("order_select_product"), Markup.inlineKeyboard(buttons));
    }
  };

  bot.command("buy", orderCommandHandler);
  bot.command("order", orderCommandHandler);
  bot.command("catalog", async (ctx) => {
    await trackCommand({
      userId: ctx.dbUser?.id,
      username: ctx.from?.username,
      command: "/catalog",
      source: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup" ? Source.TELEGRAM_GROUP : Source.TELEGRAM_BOT,
    });

    const products = await prisma.product.findMany({
      include: { model: true },
      orderBy: [{ modelId: "asc" }, { id: "asc" }],
      take: 30,
    });

    if (products.length === 0) {
      await ctx.reply(ctx.t("no_products"));
      return;
    }

    let text = `📋 *Katalog / Каталог:*\n\n`;
    let currentModelId = -1;

    products.forEach((p) => {
      if (p.modelId !== currentModelId) {
        currentModelId = p.modelId;
        const modelName = ctx.dbUser?.language === "ru" ? p.model.nameRu : p.model.nameUz;
        text += `\n🚗 *${modelName}*\n`;
      }
      const name = ctx.dbUser?.language === "ru" ? p.nameRu : p.nameUz;
      text += `  • #${p.id} — ${name} — $${p.price ?? "?"}\n`;
    });

    text += `\n💡 Buyurtma: /buy <ID> yoki /order <ID>`;

    await ctx.reply(text, { parse_mode: "Markdown" });
  });

  // ── 3. Inline callback: user selected a product from the list ─────────────
  bot.action(/^order_prod_select_(\d+)$/, async (ctx) => {
    const productId = parseInt(ctx.match[1], 10);
    await ctx.answerCbQuery();

    await trackButtonClick({
      userId: ctx.dbUser?.id,
      username: ctx.from?.username,
      buttonName: "Select Product for Order",
      productId: productId,
      source: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup" ? Source.TELEGRAM_GROUP : Source.TELEGRAM_BOT,
    });

    if (!ctx.dbUser?.customer) {
      await ctx.reply(ctx.t("order_not_registered"));
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { model: true },
    });
    if (!product) {
      await ctx.reply("❌ Product not found.");
      return;
    }

    const productName = ctx.dbUser.language === "ru" ? product.nameRu : product.nameUz;
    const modelName = ctx.dbUser.language === "ru" ? product.model.nameRu : product.model.nameUz;

    if (!ctx.session) ctx.session = {};
    ctx.session.orderProductId = productId;
    ctx.session.step = "ORDER_ENTER_QUANTITY";

    await ctx.editMessageText(
      `📦 *${productName}* (${modelName})\n💰 $${product.price ?? "N/A"}\n\n` +
      ctx.t("order_enter_quantity"),
      { parse_mode: "Markdown" }
    );
  });

  // ── 4. /start order_<id> deep link ───────────────────────────────────────
  // Handled in start.ts via the start command, so we handle the action here:
  bot.action(/^deep_order_(\d+)$/, async (ctx) => {
    const productId = parseInt(ctx.match[1], 10);
    await ctx.answerCbQuery();

    await trackButtonClick({
      userId: ctx.dbUser?.id,
      username: ctx.from?.username,
      buttonName: "Deep Link Order",
      productId: productId,
      source: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup" ? Source.TELEGRAM_GROUP : Source.TELEGRAM_BOT,
    });

    if (!ctx.session) ctx.session = {};
    ctx.session.orderProductId = productId;
    ctx.session.step = "ORDER_ENTER_QUANTITY";
    await ctx.reply(ctx.t("order_enter_quantity"));
  });

  // ── 5. Conversational text handler for order flow ─────────────────────────
  bot.on("text", async (ctx, next) => {
    const step = ctx.session?.step;
    if (!step || !step.startsWith("ORDER_")) return next();

    const text = ctx.message.text.trim();

    // Allow cancellation at any step
    if (text === "/cancel" || text === ctx.t("btn_back")) {
      if (ctx.session) ctx.session.step = "MAIN_MENU";
      await ctx.reply(ctx.t("order_cancelled"));
      return;
    }

    if (step === "ORDER_ENTER_QUANTITY") {
      const qty = parseInt(text, 10);
      if (isNaN(qty) || qty < 1 || qty > 99) {
        await ctx.reply(ctx.t("order_invalid_quantity"));
        return;
      }
      ctx.session!.orderQuantity = qty;
      ctx.session!.step = "ORDER_ENTER_NOTES";
      await ctx.reply(
        ctx.t("order_enter_notes"),
        Markup.keyboard([[ctx.t("btn_skip")]]).resize().oneTime()
      );
      return;
    }

    if (step === "ORDER_ENTER_NOTES") {
      const notes = text === ctx.t("btn_skip") || text === "/skip" ? undefined : text;
      const productId = ctx.session!.orderProductId!;
      const quantity = ctx.session!.orderQuantity ?? 1;
      const { fullName, phoneNumber } = ctx.dbUser!.customer!;

      await createOrder(bot, ctx, productId, fullName, phoneNumber, quantity, notes);
      return;
    }

    return next();
  });

  // ── 6. /skip shortcut for notes ──────────────────────────────────────────
  bot.command("skip", async (ctx, next) => {
    if (ctx.session?.step !== "ORDER_ENTER_NOTES") return next();
    const productId = ctx.session.orderProductId!;
    const quantity = ctx.session.orderQuantity ?? 1;
    const { fullName, phoneNumber } = ctx.dbUser!.customer!;
    await createOrder(bot, ctx, productId, fullName, phoneNumber, quantity);
  });

  // ── 7. Admin inline button handlers for order status changes ─────────────
  const handleOrderStatusChange = async (ctx: MyContext, orderId: number, newStatus: string) => {
    await ctx.answerCbQuery();
    
    const ADMIN_CHAT_ID = process.env.UPLOAD_CHAT_ID;
    if (!ADMIN_CHAT_ID) return;

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { 
          items: {
            include: {
              product: {
                include: { model: true }
              }
            }
          },
          user: true
        }
      });

      if (!order) {
        await ctx.reply("❌ Order not found");
        return;
      }

      const oldStatus = order.status;
      if (oldStatus === newStatus) {
        await ctx.reply(`Order is already ${newStatus}`);
        return;
      }

      // Update order status
      await prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus as any }
      });

      // Record order history
      await prisma.orderHistory.create({
        data: {
          orderId: orderId,
          oldStatus: oldStatus as any,
          newStatus: newStatus as any,
          changedBy: "TELEGRAM_BOT",
          changedById: ctx.from?.id.toString(),
          notes: `Status changed from ${oldStatus} to ${newStatus} via Telegram Bot`
        }
      });

      // Update the Telegram message
      const date = new Date(order.createdAt).toLocaleString("uz-UZ", {
        timeZone: "Asia/Tashkent",
      });

      const updatedDate = new Date().toLocaleString("uz-UZ", {
        timeZone: "Asia/Tashkent",
      });

      let productsText = "";
      let totalItems = 0;
      let totalProducts = 0;

      if (order.items && order.items.length > 0) {
        totalProducts = order.items.length;
        order.items.forEach((item) => {
          totalItems += item.quantity;
          productsText += `📦 ${item.product.nameUz} / ${item.product.nameRu}\n`;
          productsText += `   └ Model: ${item.product.model.nameUz} / ${item.product.model.nameRu}\n`;
          productsText += `   └ Miqdor: ${item.quantity} × $${item.price ?? "N/A"}\n\n`;
        });
      }

      const text =
        `🛒 *Buyurtma / Заказ #${order.id}*\n\n` +
        `👤 Mijoz: ${order.fullName}\n` +
        `🔖 Username: @${order.user?.username ?? "—"} (ID: ${order.user?.id})\n` +
        `📞 Telefon: ${order.phoneNumber}\n\n` +
        productsText +
        `� Jami mahsulotlar: ${totalItems}\n` +
        `📦 Mahsulotlar soni: ${totalProducts}\n` +
        `💰 Jami narx: $${order.totalAmount?.toLocaleString() ?? "N/A"}\n` +
        `📝 Izoh: ${order.notes ?? "—"}\n` +
        `📅 Sana: ${date}\n\n` +
        `📊 *Status: ${newStatus}*\n` +
        `🔄 Updated: ${updatedDate}\n` +
        `👤 By: Admin (Telegram)\n\n` +
        `🔗 Admin: http://localhost:8000/admin/`;

      if (order.telegramMessageId) {
        await bot.telegram.editMessageText(
          ADMIN_CHAT_ID,
          parseInt(order.telegramMessageId),
          undefined,
          text,
          {
            parse_mode: "Markdown",
            reply_markup: Markup.inlineKeyboard([
              [
                Markup.button.callback("✅ Accept", `order_accept_${order.id}`),
                Markup.button.callback("🚚 Processing", `order_processing_${order.id}`)
              ],
              [
                Markup.button.callback("✔️ Complete", `order_complete_${order.id}`),
                Markup.button.callback("❌ Cancel", `order_cancel_${order.id}`)
              ]
            ]).reply_markup
          }
        );
      }

      console.log(`[ORDER] Order #${orderId} status changed from ${oldStatus} to ${newStatus} by admin via Telegram`);
    } catch (error) {
      console.error("[ORDER] Failed to change order status:", error);
      await ctx.reply("❌ Failed to change order status");
    }
  };

  bot.action(/^order_accept_(\d+)$/, async (ctx) => {
    const orderId = parseInt(ctx.match[1], 10);
    await handleOrderStatusChange(ctx, orderId, "PROCESSING");
  });

  bot.action(/^order_processing_(\d+)$/, async (ctx) => {
    const orderId = parseInt(ctx.match[1], 10);
    await handleOrderStatusChange(ctx, orderId, "PROCESSING");
  });

  bot.action(/^order_complete_(\d+)$/, async (ctx) => {
    const orderId = parseInt(ctx.match[1], 10);
    await handleOrderStatusChange(ctx, orderId, "COMPLETED");
  });

  bot.action(/^order_cancel_(\d+)$/, async (ctx) => {
    const orderId = parseInt(ctx.match[1], 10);
    await handleOrderStatusChange(ctx, orderId, "CANCELLED");
  });
}
