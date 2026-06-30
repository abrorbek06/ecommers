import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Lock, LogIn } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center py-16 px-4 max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-12 h-12 text-orange-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            {language === 'uz' ? 'Kirish talab etiladi' : 'Требуется авторизация'}
          </h2>
          <p className="text-gray-600 mb-8">
            {language === 'uz' 
              ? 'Bu sahifaga kirish uchun tizimga kiring'
              : 'Войдите в систему, чтобы получить доступ к этой странице'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/login"
              className="inline-flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              <span>{language === 'uz' ? 'Tizimga kirish' : 'Войти'}</span>
            </a>
            <a
              href="/register"
              className="inline-flex items-center justify-center space-x-2 border border-gray-300 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              <span>{language === 'uz' ? "Ro'yxatdan o'tish" : 'Регистрация'}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
