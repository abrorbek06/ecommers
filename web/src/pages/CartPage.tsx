import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';

const CartPage = () => {
  const { t, language } = useLanguage();
  const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (cart.length === 0) return;
    navigate('/checkout');
  };

  if (cart.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="w-24 h-24 text-gray-400 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('cart.empty')}</h2>
        <p className="text-gray-600 mb-6">
          {language === 'uz' 
            ? 'Savatga mahsulot qo\'shish uchun katalogga o\'ting'
            : 'Перейдите в каталог, чтобы добавить товары в корзину'}
        </p>
        <Link
          to="/catalog"
          className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          <span>{t('cart.continue')}</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('cart.title')}</h1>
        <button
          onClick={clearCart}
          className="text-red-600 hover:text-red-700 text-sm font-medium"
        >
          {language === 'uz' ? 'Savatni tozalash' : 'Очистить корзину'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="bg-white rounded-xl p-4 shadow-sm flex items-start space-x-4"
            >
              {/* Product Image */}
              {item.image && (
                <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <Link
                  to={`/product/${item.productId}`}
                  className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-2"
                >
                  {item.name}
                </Link>
                {item.price && (
                  <p className="text-lg font-bold text-blue-600 mt-1">
                    {(item.price * item.quantity).toLocaleString()} so'm
                  </p>
                )}
                {item.price && (
                  <p className="text-sm text-gray-600">
                    {item.price.toLocaleString()} so'm × {item.quantity}
                  </p>
                )}
              </div>

              {/* Quantity Controls */}
              <div className="flex flex-col items-end space-y-2">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="px-3 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 font-medium text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="px-3 py-1 hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="text-red-600 hover:text-red-700 p-1"
                  title={t('cart.remove')}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm h-fit sticky top-20">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {language === 'uz' ? 'Buyurtma haqida' : 'О заказе'}
          </h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-gray-600">
              <span>{language === 'uz' ? 'Mahsulotlar' : 'Товары'}</span>
              <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{language === 'uz' ? 'Yetkazib berish' : 'Доставка'}</span>
              <span>{language === 'uz' ? 'Bepul' : 'Бесплатно'}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>{t('cart.total')}</span>
                <span>{cartTotal.toLocaleString()} so'm</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <span>{t('cart.checkout')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <Link
            to="/catalog"
            className="block w-full text-center mt-3 text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('cart.continue')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CartPage;