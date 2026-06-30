import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCreateOrder } from '../hooks/useApi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShoppingBag, CheckCircle, ArrowLeft } from 'lucide-react';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string().min(9, 'Phone number must be at least 9 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  notes: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

const CheckoutPage = () => {
  const { t, language } = useLanguage();
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const createOrder = useCreateOrder();
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: user?.customer?.fullName || '',
      phoneNumber: user?.customer?.phoneNumber || '',
      address: '',
    },
  });

  const onSubmit = async (data: CheckoutFormData) => {
    try {
      const orderData = {
        userId: user?.id || null,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        address: data.address,
        notes: data.notes,
      };

      const result = await createOrder.mutateAsync(orderData);
      
      if (result.success) {
        setOrderId(result.orderId);
        clearCart();
        setOrderSuccess(true);
      }
    } catch (error) {
      console.error('Order creation failed:', error);
    }
  };

  if (cart.length === 0 && !orderSuccess) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="w-24 h-24 text-gray-400 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('cart.empty')}</h2>
        <Link
          to="/catalog"
          className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('catalog.title')}</span>
        </Link>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle className="w-16 h-16 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('checkout.success')}</h2>
        <p className="text-xl text-gray-600 mb-6">{t('checkout.thankYou')}</p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto mb-8">
          <p className="text-sm font-medium text-blue-800 mb-2">{t('checkout.confirmation')}</p>
          {orderId && (
            <p className="text-2xl font-bold text-blue-900 mb-2">
              {t('checkout.orderNumber')}: #{orderId}
            </p>
          )}
          <p className="text-sm text-blue-700">{t('checkout.processing')}</p>
        </div>
        
        <p className="text-gray-600 mb-8 flex items-center justify-center space-x-2">
          <span className="text-lg">📞</span>
          <span>{t('checkout.contactSoon')}</span>
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/orders"
            className="inline-flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <span>{t('nav.orders')}</span>
          </Link>
          <Link
            to="/catalog"
            className="inline-flex items-center justify-center space-x-2 border border-gray-300 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            <span>{t('catalog.title')}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Link
          to="/cart"
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('checkout.title')}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl p-6 shadow-sm space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('checkout.fullName')} *
              </label>
              <input
                type="text"
                {...register('fullName')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={language === 'uz' ? 'Ism Familiya' : 'Имя Фамилия'}
              />
              {errors.fullName && (
                <p className="text-red-600 text-sm mt-1">{errors.fullName.message}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('checkout.phone')} *
              </label>
              <input
                type="tel"
                {...register('phoneNumber')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+998 90 123 45 67"
              />
              {errors.phoneNumber && (
                <p className="text-red-600 text-sm mt-1">{errors.phoneNumber.message}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {language === 'uz' ? 'Yetkazib berish manzili' : 'Адрес доставки'} *
              </label>
              <textarea
                {...register('address')}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder={language === 'uz' ? 'Manzilingizni kiriting...' : 'Введите ваш адрес...'}
              />
              {errors.address && (
                <p className="text-red-600 text-sm mt-1">{errors.address.message}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('checkout.notes')}
              </label>
              <textarea
                {...register('notes')}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder={language === 'uz' ? 'Qo\'shimcha izoh...' : 'Дополнительное примечание...'}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('common.loading')}</span>
                </>
              ) : (
                <>
                  <span>{t('checkout.submit')}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm h-fit sticky top-20">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {language === 'uz' ? 'Buyurtma tafsilotlari' : 'Детали заказа'}
          </h2>
          
          {/* Cart Items Preview */}
          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {cart.slice(0, 5).map((item) => (
              <div key={item.productId} className="flex items-start space-x-3">
                {item.image && (
                  <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm line-clamp-2">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    {item.quantity} × {item.price?.toLocaleString()} so'm
                  </p>
                </div>
              </div>
            ))}
            {cart.length > 5 && (
              <p className="text-sm text-gray-600">
                +{cart.length - 5} {language === 'uz' ? 'boshqa mahsulot' : 'других товаров'}
              </p>
            )}
          </div>

          {/* Total */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>{language === 'uz' ? 'Mahsulotlar jami' : 'Товары всего'}</span>
              <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{language === 'uz' ? 'Yetkazib berish' : 'Доставка'}</span>
              <span>{language === 'uz' ? 'Bepul' : 'Бесплатно'}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2">
              <span>{t('cart.total')}</span>
              <span>{cartTotal.toLocaleString()} so'm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;