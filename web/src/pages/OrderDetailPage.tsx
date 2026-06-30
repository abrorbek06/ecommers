import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useOrder } from '../hooks/useApi';
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, Package, User, Phone } from 'lucide-react';

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { data: order, isLoading, error } = useOrder(parseInt(id!));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-6 h-6 text-yellow-600" />;
      case 'PROCESSING':
        return <AlertCircle className="w-6 h-6 text-blue-600" />;
      case 'COMPLETED':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'CANCELLED':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Package className="w-6 h-6 text-gray-600" />;
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
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-16">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">{t('common.error')}</p>
        <Link
          to="/orders"
          className="text-blue-600 hover:text-blue-700"
        >
          {t('orders.title')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/orders"
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <p className="text-sm text-gray-600">
            {language === 'uz' ? 'Buyurtma #' : 'Заказ №'}{order.id}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Banner */}
          <div className={`p-6 rounded-xl border-2 ${getStatusColor(order.status)}`}>
            <div className="flex items-center space-x-4">
              {getStatusIcon(order.status)}
              <div>
                <p className="text-sm font-medium opacity-75">
                  {language === 'uz' ? 'Holat:' : 'Статус:'}
                </p>
                <p className="text-xl font-bold">{getStatusText(order.status)}</p>
              </div>
            </div>
          </div>

          {/* Products Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {language === 'uz' ? 'Mahsulotlar haqida' : 'О товарах'}
            </h2>
            <div className="space-y-4">
              {(order as any).items && (order as any).items.length > 0 ? (
                (order as any).items.map((item: any) => (
                  <div key={item.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    {item.product.media && item.product.media.length > 0 ? (
                      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={`${import.meta.env.VITE_API_URL}/image/${item.product.media[0].fileId}`}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 mb-1">{item.product.name}</p>
                      <p className="text-sm text-gray-600 mb-2">{item.product.model.name}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          {language === 'uz' ? 'Miqdor:' : 'Количество:'} {item.quantity}
                        </p>
                        <p className="font-bold text-purple-600">
                          {item.price ? (item.price * item.quantity).toLocaleString() : 'N/A'} so'm
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">
                  {language === 'uz' ? 'Mahsulotlar topilmadi' : 'Товары не найдены'}
                </p>
              )}
            </div>
          </div>

          {/* Order Timeline */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {language === 'uz' ? 'Buyurtma tarixi' : 'История заказа'}
            </h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">
                    {language === 'uz' ? 'Buyurtma yaratildi' : 'Заказ создан'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {order.status !== 'PENDING' && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {language === 'uz' ? 'Qayta ishlash boshlandi' : 'Обработка начата'}
                    </p>
                  </div>
                </div>
              )}
              {order.status === 'COMPLETED' && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {language === 'uz' ? 'Buyurtma tugatildi' : 'Заказ завершен'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {language === 'uz' ? 'Mijoz ma\'lumotlari' : 'Данные клиента'}
            </h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">{language === 'uz' ? 'Ism:' : 'Имя:'}</p>
                  <p className="font-medium text-gray-900">{order.fullName}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">{language === 'uz' ? 'Telefon:' : 'Телефон:'}</p>
                  <p className="font-medium text-gray-900">{order.phoneNumber}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {language === 'uz' ? 'Buyurtma tafsilotlari' : 'Детали заказа'}
            </h2>
            <div className="space-y-3">
              {(order as any).items && (order as any).items.length > 0 && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>{language === 'uz' ? 'Mahsulotlar soni:' : 'Количество товаров:'}</span>
                    <span>{(order as any).items.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{language === 'uz' ? 'Jami mahsulotlar:' : 'Всего товаров:'}</span>
                    <span>{(order as any).items.reduce((sum: number, item: any) => sum + item.quantity, 0)}</span>
                  </div>
                </>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>{language === 'uz' ? 'Jami:' : 'Итого:'}</span>
                  <span>{(order as any).totalAmount ? (order as any).totalAmount.toLocaleString() : 'N/A'} so'm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {language === 'uz' ? 'Izoh' : 'Примечание'}
              </h2>
              <p className="text-gray-700">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;