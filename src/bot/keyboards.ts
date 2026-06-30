import { Markup } from "telegraf";
import { MyContext } from "./context";

export function getLanguageKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🇺🇿 O'zbekcha", "lang_uz"),
      Markup.button.callback("🇷🇺 Русский", "lang_ru"),
    ],
  ]);
}

export function getSubscriptionKeyboard(ctx: MyContext, channels: any[]) {
  const buttons = [
    ...channels.map((channel) => {
      const url = channel.inviteLink || `https://t.me/${channel.channelId.replace("@", "")}`;
      return [Markup.button.url(channel.title, url)];
    }),
    [Markup.button.callback(ctx.t("btn_verify_sub"), "verify_subscription")]
  ];

  return Markup.inlineKeyboard(buttons);
}

export function getContactKeyboard(ctx: MyContext) {
  return Markup.keyboard([
    [Markup.button.contactRequest(ctx.t("btn_send_contact"))],
    [ctx.t("btn_back")],
  ]).resize();
}

export function getMainMenuKeyboard(ctx: MyContext) {
  return Markup.keyboard([
    [ctx.t("btn_catalog")],
    [ctx.t("btn_profile"), ctx.t("btn_change_lang")],
  ]).resize();
}

export function getBackKeyboard(ctx: MyContext) {
  return Markup.keyboard([
    [ctx.t("btn_back")],
  ]).resize();
}

export function getModelsKeyboard(ctx: MyContext, models: any[]) {
  const buttons = models.map((m) => {
    const name = ctx.dbUser?.language === "ru" ? m.nameRu : m.nameUz;
    return [Markup.button.callback(name, `model_${m.id}`)];
  });

  return Markup.inlineKeyboard(buttons);
}

export function getProductsKeyboard(ctx: MyContext, products: any[]) {
  const buttons = products.map((p) => {
    const name = ctx.dbUser?.language === "ru" ? p.nameRu : p.nameUz;
    return [Markup.button.callback(name, `prod_view_${p.id}`)];
  });

  buttons.push([Markup.button.callback(ctx.t("btn_back"), "catalog_back_models")]);

  return Markup.inlineKeyboard(buttons);
}

export function getProductDetailKeyboard(
  ctx: MyContext,
  modelId: number,
  productId: number,
  currentIndex: number,
  totalCount: number
) {
  const row = [];

  if (totalCount > 1) {
    if (currentIndex > 0) {
      row.push(Markup.button.callback("⬅️", `prod_nav_${modelId}_${currentIndex - 1}`));
    } else {
      row.push(Markup.button.callback("❌", "noop"));
    }

    row.push(Markup.button.callback(`${currentIndex + 1}/${totalCount}`, "noop"));

    if (currentIndex < totalCount - 1) {
      row.push(Markup.button.callback("➡️", `prod_nav_${modelId}_${currentIndex + 1}`));
    } else {
      row.push(Markup.button.callback("❌", "noop"));
    }
  }

  return Markup.inlineKeyboard([
    [Markup.button.callback(ctx.t("btn_order"), `order_prod_${productId}`)],
    row,
    [Markup.button.callback(ctx.t("btn_back"), `model_${modelId}`)],
  ]);
}
