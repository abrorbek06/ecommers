import { Middleware } from "telegraf";
import { MyContext, DatabaseUser } from "../context";
import { prisma } from "../../config/db";

export const authMiddleware: Middleware<MyContext> = async (ctx, next) => {
  if (!ctx.from) {
    return next();
  }

  const userId = BigInt(ctx.from.id);
  const username = ctx.from.username || null;

  try {
    // Attempt to find user
    let user = await prisma.telUser.findUnique({
      where: { id: userId },
      include: { customer: true },
    });

    // If user doesn't exist, create it
    if (!user) {
      user = await prisma.telUser.create({
        data: {
          id: userId,
          username: username,
          language: ctx.from.language_code === "ru" ? "ru" : "uz",
        },
        include: { customer: true },
      });
    } else if (user.username !== username) {
      // Update username if changed
      user = await prisma.telUser.update({
        where: { id: userId },
        data: { username },
        include: { customer: true },
      });
    }

    // Attach to context
    ctx.dbUser = {
      id: user.id,
      username: user.username,
      language: user.language,
      isAdmin: user.isAdmin,
      customer: user.customer
        ? {
            fullName: user.customer.fullName,
            phoneNumber: user.customer.phoneNumber,
          }
        : null,
    };
  } catch (error) {
    console.error("Error in authMiddleware:", error);
  }

  await next();
};
