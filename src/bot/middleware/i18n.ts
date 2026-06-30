import { Middleware } from "telegraf";
import { MyContext } from "../context";
import uz from "../../locales/uz.json";
import ru from "../../locales/ru.json";

const locales: Record<string, Record<string, string>> = {
  uz: uz as Record<string, string>,
  ru: ru as Record<string, string>,
};

export const i18nMiddleware: Middleware<MyContext> = async (ctx, next) => {
  // Determine language preference
  const userLang = ctx.dbUser?.language || ctx.session?.tempLanguage || ctx.from?.language_code || "uz";
  const lang = locales[userLang] ? userLang : "uz";

  ctx.t = (key: string, replacements?: Record<string, string | number>): string => {
    let message = locales[lang]?.[key] || locales["uz"]?.[key] || key;

    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        message = message.replace(new RegExp(`{${k}}`, "g"), String(v));
      });
    }

    return message;
  };

  await next();
};
