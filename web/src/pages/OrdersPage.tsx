import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUserOrders } from '../hooks/useApi';
import { Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const OrdersPage = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { data: orders, isLoading } = useUserOrders(user?.id);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'PROCESSING':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'CANCELLED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return t('status.pending');
      case 'PROCESSING':
        return t('status.processing');
      case 'COMPLETED':
        return t('status.completed');
      case 'CANCELLED':
        return t('status.cancelled');
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16">
        <Package className="w-24 h-24 text-gray-400 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {language === 'uz' ? 'Tizimga kiring' : 'Войдите в систему'}
        </h2>
        <p className="text-gray-600 mb-6">
          {language === 'uz' 
            ? 'Buyurtmalarni ko\'rish uchun tizimga kiring'
            : 'Войдите в систему, чтобы просматривать заказы'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="w-24 h-24 text-gray-400 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('orders.empty')}</h2>
        <p className="text-gray-600 mb-6">
          {language === 'uz' 
            ? 'Sizda hali buyurtmalar yo\'q'
            : 'У вас пока нет заказов'}
        </p>
        <Link
          to="/catalog"
          className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          <span>{t('catalog.title')}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>

      <div className="space-y-4">
        {orders.map((order: any) => (
          <Link
            key={order.id}
            to={`/orders/${order.id}`}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow block"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {language === 'uz' ? 'Buyurtma #' : 'Заказ №'}{order.id}
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {order.items && order.items.length > 0 
                    ? `${order.items.length} ${language === 'uz' ? 'mahsulot' : 'товаров'}`
                    : (language === 'uz' ? 'Mahsulot' : 'Товар')}
                </p>
                {order.items && order.items.length > 0 && (
                  <p className="text-sm text-gray-600">
                    {order.items[0].product.name}
                    {order.items.length > 1 && ` +${order.items.length - 1} ${language === 'uz' ? 'boshqa' : 'других'}`}
                  </p>
                )}
              </div>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                <span>{getStatusText(order.status)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="space-y-1">
                <p className="text-gray-600">
                  {language === 'uz' ? 'Sana:' : 'Дата:'} {new Date(order.createdAt).toLocaleDateString()}
                </p>
                {order.items && order.items.length > 0 && (
                  <p className="text-gray-600">
                    {language === 'uz' ? 'Jami mahsulotlar:' : 'Всего товаров:'} {order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}
                  </p>
                )}
              </div>
              {order.totalAmount && (
                <div className="text-right">
                  <p className="font-bold text-blue-600">
                    {order.totalAmount.toLocaleString()} so'm
                  </p>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default OrdersPage;