import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type Language = 'uz' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  uz: {
    // Navigation
    'nav.home': 'Bosh sahifa',
    'nav.catalog': 'Katalog',
    'nav.cart': 'Savat',
    'nav.profile': 'Profil',
    'nav.orders': 'Buyurtmalar',
    
    // Home
    'home.title': 'BYD Ehtiyot Qismlari',
    'home.subtitle': 'Sifatli ehtiyot qismlar onlayn do\'konida',
    'home.categories': 'Kategoriyalar',
    'home.featured': 'Tanlangan mahsulotlar',
    'home.viewAll': 'Barchasini ko\'rish',
    
    // Catalog
    'catalog.title': 'Mahsulotlar katalogi',
    'catalog.search': 'Qidirish...',
    'catalog.filter': 'Filtrlar',
    'catalog.sort': 'Saralash',
    'catalog.noResults': 'Mahsulotlar topilmadi',
    'catalog.loadMore': 'Yana yuklash',
    
    // Product
    'product.addtocart': 'Savatga qo\'shish',
    'product.instock': 'Mavjud',
    'product.outofstock': 'Mavjud emas',
    'product.quantity': 'Miqdor',
    'product.description': 'Tavsif',
    
    // Cart
    'cart.title': 'Savat',
    'cart.empty': 'Savat bo\'sh',
    'cart.total': 'Jami:',
    'cart.checkout': 'Buyurtma berish',
    'cart.remove': 'O\'chirish',
    'cart.continue': 'Xaridni davom ettirish',
    
    // Checkout
    'checkout.title': 'Buyurtma rasmiylashtirish',
    'checkout.fullName': 'F.I.O',
    'checkout.phone': 'Telefon raqam',
    'checkout.notes': 'Izoh',
    'checkout.submit': 'Buyurtma berish',
    'checkout.success': 'Buyurtmangiz muvaffaqiyatli qabul qilindi!',
    'checkout.confirmation': 'Buyurtma tasdiqlandi',
    'checkout.orderNumber': 'Buyurtma raqami',
    'checkout.thankYou': 'Sizga xizmat ko\'rsatishdan xursandmiz!',
    'checkout.contactSoon': 'Tez orada siz bilan bog\'lanamiz',
    'checkout.processing': 'Buyurtmangiz qayta ishlanmoqda',
    
    // Orders
    'orders.title': 'Buyurtmalarim',
    'orders.empty': 'Sizda hali buyurtmalar yo\'q',
    'orders.status': 'Holat',
    'orders.date': 'Sana',
    'orders.total': 'Jami',
    
    // Profile
    'profile.title': 'Profil',
    'profile.edit': 'Tahrirlash',
    'profile.save': 'Saqlash',
    'profile.logout': 'Chiqish',

    // Auth
    'auth.login': 'Tizimga kirish',
    'auth.register': "Ro'yxatdan o'tish",
    'auth.phone': 'Telefon raqam',
    'auth.otp': 'Tasdiqlash kodi',
    'auth.fullName': 'F.I.O',
    'auth.sendCode': 'Kod yuborish',
    'auth.verifyCode': 'Tasdiqlash',
    'auth.resendCode': 'Qayta yuborish',
    'auth.otherPhone': 'Boshqa raqam',
    'auth.back': 'Orqaga',
    'auth.howItWorks': 'Qanday ishlaydi?',
    'auth.instructions': '1. Telegram botni boshlang\n2. Telefon raqamingizni kiriting\n3. Botdan kelgan kodni tasdiqlang',
    'auth.hasAccount': 'Hisobingiz bormi?',
    'auth.noAccount': "Hisobingiz yo'qmi?",
    'auth.loginLink': 'Tizimga kirish',
    'auth.registerLink': "Ro'yxatdan o'tish",
    'auth.confirmViaTelegram': 'Telegram orqali tasdiqlang',
    'auth.codeSent': 'Telegram bot orqali tasdiqlash kodi yuboriladi',
    'auth.codeValid': '5 daqiqa ichida amal qiladi',
    'auth.sending': 'Yuborilmoqda...',
    'auth.verifying': 'Tekshirilmoqda...',
    'auth.loginRequired': 'Kirish talab etiladi',
    'auth.loginRequiredDesc': 'Bu sahifaga kirish uchun tizimga kiring',
    'auth.enterPhone': 'Ism Familiya',
    'auth.enterPhonePlaceholder': '+998 90 123 45 67',
    
    // Order Status
    'status.pending': 'Kutilmoqda',
    'status.processing': 'Qayta ishlanmoqda',
    'status.completed': 'Bajarildi',
    'status.cancelled': 'Bekor qilindi',
    
    // Common
    'common.back': 'Orqaga',
    'common.loading': 'Yuklanmoqda...',
    'common.error': 'Xatolik yuz berdi',
    'common.retry': 'Qayta urinish',
    'common.language': 'Til',
    'common.uzbek': 'O\'zbek',
    'common.russian': 'Rus'
  },
  ru: {
    // Navigation
    'nav.home': 'Главная',
    'nav.catalog': 'Каталог',
    'nav.cart': 'Корзина',
    'nav.profile': 'Профиль',
    'nav.orders': 'Заказы',
    
    // Home
    'home.title': 'Запчасти BYD',
    'home.subtitle': 'Качественные запчасти в интернет-магазине',
    'home.categories': 'Категории',
    'home.featured': 'Рекомендуемые товары',
    'home.viewAll': 'Смотреть все',
    
    // Catalog
    'catalog.title': 'Каталог товаров',
    'catalog.search': 'Поиск...',
    'catalog.filter': 'Фильтры',
    'catalog.sort': 'Сортировка',
    'catalog.noResults': 'Товары не найдены',
    'catalog.loadMore': 'Загрузить еще',
    
    // Product
    'product.addtocart': 'Добавить в корзину',
    'product.instock': 'В наличии',
    'product.outofstock': 'Нет в наличии',
    'product.quantity': 'Количество',
    'product.description': 'Описание',
    
    // Cart
    'cart.title': 'Корзина',
    'cart.empty': 'Корзина пуста',
    'cart.total': 'Итого:',
    'cart.checkout': 'Оформить заказ',
    'cart.remove': 'Удалить',
    'cart.continue': 'Продолжить покупки',
    
    // Checkout
    'checkout.title': 'Оформление заказа',
    'checkout.fullName': 'Ф.И.О',
    'checkout.phone': 'Телефон',
    'checkout.notes': 'Примечание',
    'checkout.submit': 'Оформить заказ',
    'checkout.success': 'Ваш заказ успешно принят!',
    'checkout.confirmation': 'Заказ подтвержден',
    'checkout.orderNumber': 'Номер заказа',
    'checkout.thankYou': 'Спасибо за ваш заказ!',
    'checkout.contactSoon': 'Скоро мы с вами свяжемся',
    'checkout.processing': 'Ваш заказ обрабатывается',
    
    // Orders
    'orders.title': 'Мои заказы',
    'orders.empty': 'У вас пока нет заказов',
    'orders.status': 'Статус',
    'orders.date': 'Дата',
    'orders.total': 'Итого',
    
    // Profile
    'profile.title': 'Профиль',
    'profile.edit': 'Редактировать',
    'profile.save': 'Сохранить',
    'profile.logout': 'Выйти',

    // Auth
    'auth.login': 'Вход в систему',
    'auth.register': 'Регистрация',
    'auth.phone': 'Номер телефона',
    'auth.otp': 'Код подтверждения',
    'auth.fullName': 'Ф.И.О',
    'auth.sendCode': 'Отправить код',
    'auth.verifyCode': 'Подтвердить',
    'auth.resendCode': 'Отправить повторно',
    'auth.otherPhone': 'Другой номер',
    'auth.back': 'Назад',
    'auth.howItWorks': 'Как это работает?',
    'auth.instructions': '1. Запустите Telegram бота\n2. Введите номер телефона\n3. Подтвердите код из бота',
    'auth.hasAccount': 'Уже есть аккаунт?',
    'auth.noAccount': 'Нет аккаунта?',
    'auth.loginLink': 'Войти',
    'auth.registerLink': 'Регистрация',
    'auth.confirmViaTelegram': 'Подтвердите через Telegram',
    'auth.codeSent': 'Код подтверждения будет отправлен через Telegram бота',
    'auth.codeValid': 'Действует 5 минут',
    'auth.sending': 'Отправка...',
    'auth.verifying': 'Проверка...',
    'auth.loginRequired': 'Требуется авторизация',
    'auth.loginRequiredDesc': 'Войдите в систему, чтобы получить доступ к этой странице',
    'auth.enterPhone': 'Имя Фамилия',
    'auth.enterPhonePlaceholder': '+998 90 123 45 67',
    
    // Order Status
    'status.pending': 'Ожидает',
    'status.processing': 'В обработке',
    'status.completed': 'Выполнен',
    'status.cancelled': 'Отменен',
    
    // Common
    'common.back': 'Назад',
    'common.loading': 'Загрузка...',
    'common.error': 'Произошла ошибка',
    'common.retry': 'Повторить',
    'common.language': 'Язык',
    'common.uzbek': 'Узбекский',
    'common.russian': 'Русский'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('uz');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'uz' || savedLanguage === 'ru')) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        t
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};