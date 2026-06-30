import { Middleware } from "telegraf";
import { MyContext } from "../context";
import { prisma } from "../../config/db";

export const prismaSession = (): Middleware<MyContext> => {
  return async (ctx, next) => {
    if (!ctx.chat) {
      return next();
    }

    const chatId = ctx.chat.id.toString();

    // Load session from database
    let sessionData = {};
    try {
      const sessionRecord = await prisma.session.findUnique({
        where: { chatId },
      });
      if (sessionRecord) {
        sessionData = JSON.parse(sessionRecord.data);
      }
    } catch (error) {
      console.error("Failed to load session from database:", error);
    }

    ctx.session = sessionData;

    // Run downstream handlers
    await next();

    // Save session back to database
    try {
      await prisma.session.upsert({
        where: { chatId },
        update: {
          data: JSON.stringify(ctx.session),
          updatedAt: new Date(),
        },
        create: {
          chatId,
          data: JSON.stringify(ctx.session),
        },
      });
    } catch (error) {
      console.error("Failed to save session to database:", error);
    }
  };
};
