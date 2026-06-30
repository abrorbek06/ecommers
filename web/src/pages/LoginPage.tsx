import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Smartphone, ArrowRight, Shield, Clock, RefreshCw } from 'lucide-react';

const LoginPage = () => {
  const { t, language } = useLanguage();
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const result = await requestOtp(phoneNumber);
    
    setLoading(false);
    
    if (result.success) {
      setSuccess(result.message);
      setStep('otp');
      startResendCountdown();
    } else {
      setError(result.message);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const result = await verifyOtp(phoneNumber, otpCode);
    
    setLoading(false);
    
    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } else {
      setError(result.message);
    }
  };

  const handleResendOtp = async () => {
    if (resendDisabled) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    const result = await requestOtp(phoneNumber);
    
    setLoading(false);
    
    if (result.success) {
      setSuccess(result.message);
      setOtpCode('');
      startResendCountdown();
    } else {
      setError(result.message);
    }
  };

  const startResendCountdown = () => {
    setResendDisabled(true);
    setCountdown(60);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatPhoneNumber = (value: string) => {
    // Allow only numbers and + sign
    const cleaned = value.replace(/[^\d+]/g, '');
    return cleaned;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {language === 'uz' ? 'Tizimga kirish' : 'Вход в систему'}
            </h1>
            <p className="text-gray-600">
              {language === 'uz' 
                ? 'Telegram orqali tasdiqlang' 
                : 'Подтвердите через Telegram'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}

          {/* Step 1: Phone Number Input */}
          {step === 'phone' && (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'uz' ? 'Telefon raqam' : 'Номер телефона'}
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  {language === 'uz' 
                    ? 'Telegram bot orqali tasdiqlash kodi yuboriladi' 
                    : 'Код подтверждения будет отправлен через Telegram бота'}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{language === 'uz' ? 'Yuborilmoqda...' : 'Отправка...'}</span>
                  </>
                ) : (
                  <>
                    <span>{language === 'uz' ? 'Kod yuborish' : 'Отправить код'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: OTP Input */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'uz' ? 'Tasdiqlash kodi' : 'Код подтверждения'}
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-center tracking-widest"
                  maxLength={6}
                  required
                  autoFocus
                />
                <div className="mt-3 flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>
                    {language === 'uz' ? '5 daqiqa ichida amal qiladi' : 'Действует 5 минут'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{language === 'uz' ? 'Tekshirilmoqda...' : 'Проверка...'}</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>{language === 'uz' ? 'Tasdiqlash' : 'Подтвердить'}</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendDisabled || loading}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1 mx-auto"
                >
                  <RefreshCw className={`w-4 h-4 ${resendDisabled ? '' : 'animate-spin'}`} />
                  <span>
                    {language === 'uz' ? 'Qayta yuborish' : 'Отправить повторно'}
                    {resendDisabled && ` (${countdown}s)`}
                  </span>
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-gray-600 hover:text-gray-900 text-sm"
                >
                  {language === 'uz' ? 'Boshqa raqam' : 'Другой номер'}
                </button>
              </div>
            </form>
          )}

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong className="block mb-1">
                {language === 'uz' ? 'Qanday ishlaydi?' : 'Как это работает?'}
              </strong>
              {language === 'uz' 
                ? '1. Telegram botni boshlang\n2. Telefon raqamingizni kiriting\n3. Botdan kelgan kodni tasdiqlang'
                : '1. Запустите Telegram бота\n2. Введите номер телефона\n3. Подтвердите код из бота'}
            </p>
          </div>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              {language === 'uz' ? "Hisobingiz yo'qmi?" : 'Нет аккаунта?'}{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                {language === 'uz' ? "Ro'yxatdan o'tish" : 'Регистрация'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;