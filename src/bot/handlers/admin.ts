import { Telegraf } from "telegraf";
import { MyContext } from "../context";
import { prisma } from "../../config/db";

export function registerAdminHandlers(bot: Telegraf<MyContext>) {
  // Helper middleware check for admin status
  const isAdmin = (ctx: MyContext): boolean => {
    return ctx.dbUser?.isAdmin === true;
  };

  // 1. Admin dashboard command
  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx)) return;
    return ctx.reply(ctx.t("admin_welcome"));
  });

  // 2. View subscription channels
  bot.command("channels", async (ctx) => {
    if (!isAdmin(ctx)) return;

    try {
      const channels = await prisma.confirmChannel.findMany();
      if (channels.length === 0) {
        return ctx.reply("No mandatory channels registered.");
      }

      let response = "📋 *Registered Channels:*\n\n";
      channels.forEach((c: { id: number; channelId: string; title: string; inviteLink: string | null }) => {
        response += `ID: \`${c.id}\` | Username: \`${c.channelId}\` | Title: *${c.title}*\n`;
        if (c.inviteLink) response += `Link: ${c.inviteLink}\n`;
        response += `---\n`;
      });

      return ctx.replyWithMarkdown(response);
    } catch (error) {
      console.error(error);
      return ctx.reply("Error fetching channels.");
    }
  });

  // 3. Add subscription channel
  // Format: /addchannel @channel_username | Channel Title | https://t.me/invite_link
  bot.command("addchannel", async (ctx) => {
    if (!isAdmin(ctx)) return;

    const text = ctx.message.text.replace("/addchannel", "").trim();
    const parts = text.split("|").map((p) => p.trim());

    if (parts.length < 2 || !parts[0].startsWith("@") && !parts[0].startsWith("-")) {
      return ctx.reply(
        "Usage: `/addchannel @username | Channel Title | [Optional Invite Link]`\nExample: `/addchannel @mychannel | My Channel | https://t.me/join`"
      );
    }

    const channelId = parts[0];
    const title = parts[1];
    const inviteLink = parts[2] || null;

    try {
      const channel = await prisma.confirmChannel.upsert({
        where: { channelId },
        update: { title, inviteLink },
        create: { channelId, title, inviteLink },
      });

      return ctx.reply(`Successfully registered channel: ${channel.title} (${channel.channelId})`);
    } catch (error) {
      console.error(error);
      return ctx.reply("Failed to add channel.");
    }
  });

  // 4. Delete subscription channel
  bot.command("deletechannel", async (ctx) => {
    if (!isAdmin(ctx)) return;

    const channelIdStr = ctx.message.text.replace("/deletechannel", "").trim();
    if (!channelIdStr) {
      return ctx.reply("Usage: `/deletechannel <database_id_or_channel_username>`\nExample: `/deletechannel 2` or `/deletechannel @mychannel`");
    }

    const id = parseInt(channelIdStr, 10);

    if (!isNaN(id)) {
      try {
        const deleted = await prisma.confirmChannel.delete({ where: { id } });
        return ctx.reply(`Deleted channel: ${deleted.title} (ID: ${id})`);
      } catch (error) {
        // Fallback to checking by channelId (in case the channelId itself is a numeric string)
      }
    }

    try {
      const deleted = await prisma.confirmChannel.delete({ where: { channelId: channelIdStr } });
      return ctx.reply(`Deleted channel: ${deleted.title} (${deleted.channelId})`);
    } catch (error) {
      console.error(error);
      return ctx.reply("Channel not found or error deleting. Verify the ID or username is correct.");
    }
  });

  // 5. Add model
  // Format: /addmodel ModelNameUz | ModelNameRu
  bot.command("addmodel", async (ctx) => {
    if (!isAdmin(ctx)) return;

    const text = ctx.message.text.replace("/addmodel", "").trim();
    const parts = text.split("|").map((p) => p.trim());

    if (parts.length < 2) {
      return ctx.reply("Usage: `/addmodel Model Name Uz | Model Name Ru`\nExample: `/addmodel BYD Chazor | BYD Chazor`");
    }

    try {
      const model = await prisma.vehicleModel.create({
        data: {
          nameUz: parts[0],
          nameRu: parts[1],
        },
      });

      return ctx.reply(`Successfully added vehicle model: ${model.nameUz} (ID: ${model.id})`);
    } catch (error) {
      console.error(error);
      return ctx.reply("Failed to add model.");
    }
  });

  // 6. Delete model
  bot.command("deletemodel", async (ctx) => {
    if (!isAdmin(ctx)) return;

    const modelIdStr = ctx.message.text.replace("/deletemodel", "").trim();
    if (!modelIdStr) {
      return ctx.reply("Usage: `/deletemodel <model_id>`");
    }

    const id = parseInt(modelIdStr, 10);
    if (isNaN(id)) return ctx.reply("Invalid ID format.");

    try {
      await prisma.vehicleModel.delete({ where: { id } });
      return ctx.reply(`Deleted model with ID: ${id}`);
    } catch (error) {
      console.error(error);
      return ctx.reply("Model not found or error deleting.");
    }
  });

  // 7. Add product
  // Format: /addproduct modelId | NameUz | NameRu | Price | DescriptionUz | DescriptionRu
  bot.command("addproduct", async (ctx) => {
    if (!isAdmin(ctx)) return;

    const text = ctx.message.text.replace("/addproduct", "").trim();
    const parts = text.split("|").map((p) => p.trim());

    if (parts.length < 4) {
      return ctx.reply(
        "Usage: `/addproduct modelId | NameUz | NameRu | Price | [DescUz] | [DescRu]`\nExample: `/addproduct 1 | Bamper | Бампер | 150 | Old bamper | Передний бампер`"
      );
    }

    const modelId = parseInt(parts[0], 10);
    const nameUz = parts[1];
    const nameRu = parts[2];
    const price = parseFloat(parts[3]);
    const descUz = parts[4] || null;
    const descRu = parts[5] || null;

    if (isNaN(modelId) || isNaN(price)) {
      return ctx.reply("Model ID and Price must be numbers.");
    }

    try {
      const product = await prisma.product.create({
        data: {
          modelId,
          nameUz,
          nameRu,
          price,
          descUz,
          descRu,
        },
      });

      return ctx.reply(`Successfully created product: ${product.nameUz} (ID: ${product.id}). Use \`/addmedia ${product.id} <file_id>\` to add product photos.`);
    } catch (error) {
      console.error(error);
      return ctx.reply("Failed to create product. Check if Model ID exists.");
    }
  });

  // 8. Add media to product
  // Format: /addmedia productId | fileId | [photo/video]
  bot.command("addmedia", async (ctx) => {
    if (!isAdmin(ctx)) return;

    const text = ctx.message.text.replace("/addmedia", "").trim();
    const parts = text.split("|").map((p) => p.trim());

    if (parts.length < 2) {
      return ctx.reply("Usage: `/addmedia productId | fileId | [photo/video]`");
    }

    const productId = parseInt(parts[0], 10);
    const fileId = parts[1];
    const mediaType = parts[2] === "video" ? "video" : "photo";

    if (isNaN(productId)) return ctx.reply("Product ID must be a number.");

    try {
      const media = await prisma.productMedia.create({
        data: {
          productId,
          fileId,
          mediaType,
        },
      });

      return ctx.reply(`Successfully added media attachment ID: ${media.id} for Product ID: ${productId}`);
    } catch (error) {
      console.error(error);
      return ctx.reply("Failed to attach media. Check if Product ID exists.");
    }
  });

  // 9. Delete product
  bot.command("deleteproduct", async (ctx) => {
    if (!isAdmin(ctx)) return;

    const prodIdStr = ctx.message.text.replace("/deleteproduct", "").trim();
    if (!prodIdStr) {
      return ctx.reply("Usage: `/deleteproduct <product_id>`");
    }

    const id = parseInt(prodIdStr, 10);
    if (isNaN(id)) return ctx.reply("Invalid ID format.");

    try {
      await prisma.product.delete({ where: { id } });
      return ctx.reply(`Deleted product with ID: ${id}`);
    } catch (error) {
      console.error(error);
      return ctx.reply("Product not found or error deleting.");
    }
  });
}
