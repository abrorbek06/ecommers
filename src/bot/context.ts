import { Context } from "telegraf";

export interface SessionData {
  step?: "SELECT_LANGUAGE" | "ENTER_NAME" | "ENTER_PHONE" | "MAIN_MENU"
    | "ORDER_SELECT_PRODUCT" | "ORDER_ENTER_NAME" | "ORDER_ENTER_PHONE"
    | "ORDER_ENTER_QUANTITY" | "ORDER_ENTER_NOTES";
  tempName?: string;
  tempLanguage?: string;
  currentModelId?: number;
  productIds?: number[];
  productIndex?: number;

  // Order flow data
  orderProductId?: number;
  orderFullName?: string;
  orderPhone?: string;
  orderQuantity?: number;
}

export interface DatabaseUser {
  id: bigint;
  username: string | null;
  language: string;
  isAdmin: boolean;
  customer: {
    fullName: string;
    phoneNumber: string;
  } | null;
}

export interface MyContext extends Context {
  session?: SessionData;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  dbUser?: DatabaseUser;
}
