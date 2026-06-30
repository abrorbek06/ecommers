import { useState } from 'react';
import { Bell, X, Check, ExternalLink } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, clearNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAsRead = () => {
    markAsRead();
  };

  const handleClearAll = () => {
    clearNotifications();
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_ORDER':
        return '🛒';
      case 'ORDER_STATUS_CHANGE':
        return '📦';
      case 'ORDER_CANCELLED':
        return '❌';
      case 'ORDER_COMPLETED':
        return '✅';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'NEW_ORDER':
        return 'bg-blue-50 border-blue-200';
      case 'ORDER_STATUS_CHANGE':
        return 'bg-yellow-50 border-yellow-200';
      case 'ORDER_CANCELLED':
        return 'bg-red-50 border-red-200';
      case 'ORDER_COMPLETED':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) {
            handleMarkAsRead();
          }
        }}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              handleMarkAsRead();
            }}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-20 max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleMarkAsRead}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Mark all as read"
                >
                  <Check className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={handleClearAll}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Clear all"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification, index) => (
                    <div
                      key={`${notification.orderId}-${index}`}
                      className={`p-4 ${getNotificationColor(notification.type)} border-l-4 hover:bg-opacity-80 transition-colors`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t bg-gray-50">
                <button
                  onClick={() => {
                    window.location.href = '/admin/orders';
                    setIsOpen(false);
                    handleMarkAsRead();
                  }}
                  className="w-full flex items-center justify-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <span>View All Orders</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
