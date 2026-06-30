import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUserProfile, useUpdateUserProfile } from '../hooks/useApi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Phone, Mail, LogOut, Package, Edit2, CheckCircle, Shield, Calendar, CreditCard, Bell, Lock, Globe } from 'lucide-react';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: z.string().min(9, 'Phone number must be at least 9 characters'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ProfilePage = () => {
  const { t, language, setLanguage } = useLanguage();
  const { user, logout, updateUser } = useAuth();
  const { data: profile } = useUserProfile(user?.id);
  const updateUserProfile = useUpdateUserProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.customer?.fullName || '',
      phoneNumber: profile?.customer?.phoneNumber || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      if (user?.id) {
        await updateUserProfile.mutateAsync({
          userId: user.id,
          data: {
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
          },
        });
        
        // Update local auth context
        updateUser({
          customer: {
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
          },
        });

        setSaveSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Profile update failed:', error);
    }
  };

  const handleCancelEdit = () => {
    reset({
      fullName: profile?.customer?.fullName || '',
      phoneNumber: profile?.customer?.phoneNumber || '',
    });
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center py-16 px-4">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {language === 'uz' ? 'Tizimga kiring' : 'Войдите в систему'}
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {language === 'uz' 
              ? 'Profilni ko\'rish uchun tizimga kiring'
              : 'Войдите в систему, чтобы просмотреть профиль'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <span>{language === 'uz' ? 'Bosh sahifaga qaytish' : 'На главную'}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('profile.title')}</h1>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          <span>{isEditing ? (language === 'uz' ? 'Bekor qilish' : 'Отмена') : (language === 'uz' ? 'Tahrirlash' : 'Редактировать')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* User Info Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4 md:space-x-6">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                  <User className="w-10 h-10 md:w-12 md:h-12 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                    {profile?.customer?.fullName || user.username || 'User'}
                  </h2>
                  <p className="text-gray-600 text-sm md:text-base">@{user.username || user.id}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      user.isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.isAdmin ? 'Admin' : 'User'}
                    </span>
                    <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {language.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="sm:hidden p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Profile Form */}
          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
                {language === 'uz' ? 'Profilni tahrirlash' : 'Редактировать профиль'}
              </h3>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('checkout.fullName')} *
                </label>
                <input
                  type="text"
                  {...register('fullName')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="+998 90 123 45 67"
                />
                {errors.phoneNumber && (
                  <p className="text-red-600 text-sm mt-1">{errors.phoneNumber.message}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('common.loading')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('profile.save')}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 border border-gray-300 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  {language === 'uz' ? 'Bekor qilish' : 'Отмена'}
                </button>
              </div>

              {saveSuccess && (
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-xl border border-green-200">
                  <CheckCircle className="w-5 h-5" />
                  <span>{language === 'uz' ? 'Muvaffaqiyatli saqlandi!' : 'Успешно сохранено!'}</span>
                </div>
              )}
            </form>
          ) : (
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
                {language === 'uz' ? 'Shaxsiy ma\'lumotlar' : 'Личная информация'}
              </h3>

              {profile?.customer ? (
                <>
                  <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600">{t('checkout.fullName')}</p>
                      <p className="font-medium text-gray-900 truncate">{profile.customer.fullName}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-xl">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600">{t('checkout.phone')}</p>
                      <p className="font-medium text-gray-900 truncate">{profile.customer.phoneNumber}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    {language === 'uz' 
                      ? 'Shaxsiy ma\'lumotlar to\'ldirilmagan'
                      : 'Личная информация не заполнена'}
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600">Username</p>
                  <p className="font-medium text-gray-900 truncate">{user.username || user.id}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {language === 'uz' ? 'Tezkor harakatlar' : 'Быстрые действия'}
            </h3>
            <div className="space-y-2">
              <Link
                to="/orders"
                className="flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">{t('orders.title')}</span>
              </Link>
              <Link
                to="/cart"
                className="flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <span className="font-medium text-gray-900">{t('cart.title')}</span>
              </Link>
            </div>
          </div>

          {/* Account Settings */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {language === 'uz' ? 'Hisob sozlamalari' : 'Настройки аккаунта'}
            </h3>
            <div className="space-y-2">
              <button className="flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 transition-colors w-full group">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <Bell className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-medium text-gray-900">{language === 'uz' ? 'Bildirishnomalar' : 'Уведомления'}</span>
              </button>
              <button className="flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 transition-colors w-full group">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <Lock className="w-5 h-5 text-orange-600" />
                </div>
                <span className="font-medium text-gray-900">{language === 'uz' ? 'Xavfsizlik' : 'Безопасность'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 p-4 rounded-xl hover:bg-red-50 text-red-600 transition-colors w-full group"
              >
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="font-medium">{t('profile.logout')}</span>
              </button>
            </div>
          </div>

          {/* Language Settings */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {language === 'uz' ? 'Til sozlamalari' : 'Настройки языка'}
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => { setLanguage('uz'); }}
                className={`flex items-center space-x-3 p-4 rounded-xl transition-colors w-full group ${
                  language === 'uz' ? 'bg-blue-50 border-2 border-blue-500' : 'hover:bg-gray-50 border-2 border-transparent'
                }`}
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">O'zbekcha</p>
                  <p className="text-xs text-gray-600">Uzbek</p>
                </div>
                {language === 'uz' && (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                )}
              </button>
              <button
                onClick={() => { setLanguage('ru'); }}
                className={`flex items-center space-x-3 p-4 rounded-xl transition-colors w-full group ${
                  language === 'ru' ? 'bg-blue-50 border-2 border-blue-500' : 'hover:bg-gray-50 border-2 border-transparent'
                }`}
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">Русский</p>
                  <p className="text-xs text-gray-600">Russian</p>
                </div>
                {language === 'ru' && (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                )}
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 shadow-sm border border-blue-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {language === 'uz' ? 'Hisob ma\'lumotlari' : 'Информация об аккаунте'}
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-600 text-xs">User ID</p>
                  <p className="font-mono text-gray-900 text-xs">{user.id}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Calendar className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-600 text-xs">{language === 'uz' ? 'Ro\'yxatdan o\'tgan sana' : 'Дата регистрации'}</p>
                  <p className="font-medium text-gray-900 text-xs">
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;