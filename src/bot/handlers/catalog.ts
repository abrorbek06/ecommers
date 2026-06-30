import { Telegraf, Markup } from "telegraf";
import { MyContext } from "../context";
import { prisma } from "../../config/db";
import { getModelsKeyboard, getProductsKeyboard, getProductDetailKeyboard } from "../keyboards";
import { trackProductView, trackButtonClick, Source } from "../../services/activityTracker";

export function registerCatalogHandlers(bot: Telegraf<MyContext>) {
  // 1. Enter Catalog (via reply keyboard)
  bot.hears(
    [
      "🗂 Kataloglar",
      "🗂 Каталоги"
    ],
    async (ctx) => {
      await trackButtonClick({
        userId: ctx.dbUser?.id,
        username: ctx.from?.username,
        buttonName: "Catalog",
        source: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup" ? Source.TELEGRAM_GROUP : Source.TELEGRAM_BOT,
      });

      const models = await prisma.vehicleModel.findMany({
        orderBy: { nameUz: "asc" },
      });

      if (models.length === 0) {
        return ctx.reply(ctx.t("no_models"));
      }

      return ctx.reply(ctx.t("select_model"), getModelsKeyboard(ctx, models));
    }
  );

  // 2. Back to models callback
  bot.action("catalog_back_models", async (ctx) => {
    await trackButtonClick({
      userId: ctx.dbUser?.id,
      username: ctx.from?.username,
      buttonName: "Back to Models",
      source: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup" ? Source.TELEGRAM_GROUP : Source.TELEGRAM_BOT,
    });

    const models = await prisma.vehicleModel.findMany({
      orderBy: { nameUz: "asc" },
    });

    await ctx.answerCbQuery();
    await ctx.editMessageText(ctx.t("select_model"), getModelsKeyboard(ctx, models));
  });

  // 3. Select Model callback (displays list of products)
  bot.action(/^model_(\d+)$/, async (ctx) => {
    const modelId = parseInt(ctx.match[1], 10);
    const model = await prisma.vehicleModel.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      await ctx.answerCbQuery();
      return ctx.reply("Model not found.");
    }

    await trackButtonClick({
      userId: ctx.dbUser?.id,
      username: ctx.from?.username,
      buttonName: "Select Model",
      source: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup" ? Source.TELEGRAM_GROUP : Source.TELEGRAM_BOT,
    });

    const products = await prisma.product.findMany({
      where: { modelId },
      orderBy: { id: "asc" },
    });

    await ctx.answerCbQuery();

    if (products.length === 0) {
      // Edit message or send alert
      await ctx.editMessageText(
        ctx.t("no_products"),
        Markup.inlineKeyboard([[Markup.button.callback(ctx.t("btn_back"), "catalog_back_models")]])
      );
      return;
    }

    const modelName = ctx.dbUser?.language === "ru" ? model.nameRu : model.nameUz;
    await ctx.editMessageText(
      `${ctx.t("select_product")} (${modelName}):`,
      getProductsKeyboard(ctx, products)
    );
  });

  // 4. View detailed product (slider mode entry point)
  bot.action(/^prod_view_(\d+)$/, async (ctx) => {
    const productId = parseInt(ctx.match[1], 10);
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { model: true, media: true },
    });

    if (!product) {
      await ctx.answerCbQuery();
      return ctx.reply("Product not found.");
    }

    // Track product view
    const productName = ctx.dbUser?.language === "ru" ? product.nameRu : product.nameUz;
    await trackProductView({
      userId: ctx.dbUser?.id,
      username: ctx.from?.username,
      productId: product.id,
      productName: productName,
      source: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup" ? Source.TELEGRAM_GROUP : Source.TELEGRAM_BOT,
    });

    // Find all products in this model to determine the slider index
    const modelProducts = await prisma.product.findMany({
      where: { modelId: product.modelId },
      orderBy: { id: "asc" },
    });

    const index = modelProducts.findIndex((p: { id: number }) => p.id === product.id);
    await ctx.answerCbQuery();

    // Delete current message (product list list) to send a new message with media support
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Ignore message deletion errors
    }

    await sendProductSlide(ctx, product, index, modelProducts.length);
  });

  // 5. Product Slider Navigation callback
  bot.action(/^prod_nav_(\d+)_(\d+)$/, async (ctx) => {
    const modelId = parseInt(ctx.match[1], 10);
    const index = parseInt(ctx.match[2], 10);

    const modelProducts = await prisma.product.findMany({
      where: { modelId },
      orderBy: { id: "asc" },
    });

    if (index < 0 || index >= modelProducts.length) {
      await ctx.answerCbQuery();
      return;
    }

    const nextProduct = await prisma.product.findUnique({
      where: { id: modelProducts[index].id },
      include: { model: true, media: true },
    });

    if (!nextProduct) {
      await ctx.answerCbQuery();
      return;
    }

    // Track product view for navigation
    const productName = ctx.dbUser?.language === "ru" ? nextProduct.nameRu : nextProduct.nameUz;
    await trackProductView({
      userId: ctx.dbUser?.id,
      username: ctx.from?.username,
      productId: nextProduct.id,
      productName: productName,
      source: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup" ? Source.TELEGRAM_GROUP : Source.TELEGRAM_BOT,
    });

    await ctx.answerCbQuery();

    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Ignore
    }

    await sendProductSlide(ctx, nextProduct, index, modelProducts.length);
  });

  // 6. No-op handler for slider page numbers
  bot.action("noop", async (ctx) => {
    await ctx.answerCbQuery();
  });
}

/**
 * Helper to send product details with media support (photo/video/text)
 */
async function sendProductSlide(ctx: MyContext, product: any, index: number, totalCount: number) {
  const modelName = ctx.dbUser?.language === "ru" ? product.model.nameRu : product.model.nameUz;
  const name = ctx.dbUser?.language === "ru" ? product.nameRu : product.nameUz;
  const description = ctx.dbUser?.language === "ru" ? (product.descRu || "") : (product.descUz || "");
  const price = product.price ? product.price.toFixed(2) : "N/A";

  const caption = ctx.t("product_details", {
    name,
    description,
    price,
    model: modelName,
  });

  const keyboard = getProductDetailKeyboard(ctx, product.modelId, product.id, index, totalCount);

  // Check if product has media attachments
  const mainMedia = product.media?.[0];

  if (mainMedia) {
    const fileId = mainMedia.fileId;
    if (mainMedia.mediaType === "video") {
      await ctx.replyWithVideo(fileId, {
        caption,
        parse_mode: "Markdown",
        ...keyboard,
      });
    } else {
      await ctx.replyWithPhoto(fileId, {
        caption,
        parse_mode: "Markdown",
        ...keyboard,
      });
    }
  } else {
    await ctx.replyWithMarkdown(caption, keyboard);
  }
}
