import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Heart, Package, Trash2, ShoppingCart } from 'lucide-react';

const FavoritesPage = () => {
  const { language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchFavorites();
    }
  }, [isAuthenticated, user]);

  const fetchFavorites = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}favorites/user/${user?.id}?language=${language}`);
      const data = await response.json();
      setFavorites(data);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/favorites/${favoriteId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
      }
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center py-16 px-4">
          <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {language === 'uz' ? 'Tizimga kiring' : 'Войдите в систему'}
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {language === 'uz' 
              ? 'Sevimlilarni ko\'rish uchun tizimga kiring'
              : 'Войдите в систему, чтобы просмотреть избранное'}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            <span>{language === 'uz' ? 'Tizimga kirish' : 'Войти'}</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse">
            <div className="aspect-square bg-gray-200"></div>
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {language === 'uz' ? 'Sevimlilar' : 'Избранное'}
        </h1>
        <span className="text-sm text-gray-600">
          {favorites.length} {language === 'uz' ? 'mahsulot' : 'товаров'}
        </span>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'uz' ? 'Sevimlilar bo\'sh' : 'Избранное пусто'}
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {language === 'uz' 
              ? 'Sevimlilarga mahsulot qo\'shish uchun katalogga o\'ting'
              : 'Перейдите в каталог, чтобы добавить товары в избранное'}
          </p>
          <Link
            to="/catalog"
            className="inline-flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            <span>{language === 'uz' ? 'Katalogga o\'tish' : 'Перейти в каталог'}</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {favorites.map((favorite) => (
            <div key={favorite.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group relative">
              {/* Remove Button */}
              <button
                onClick={() => removeFavorite(favorite.id)}
                className="absolute top-2 right-2 z-10 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
              </button>

              {/* Product Image */}
              <Link to={`/product/${favorite.product.id}`}>
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {favorite.product.media && favorite.product.media.length > 0 ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL}/image/${favorite.product.media[0].fileId}`}
                      alt={favorite.product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center ${favorite.product.media && favorite.product.media.length > 0 ? 'hidden' : ''}`}>
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
              </Link>

              {/* Product Info */}
              <div className="p-4">
                <Link to={`/product/${favorite.product.id}`}>
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm hover:text-purple-600 transition-colors">
                    {favorite.product.name}
                  </h3>
                </Link>
                {favorite.product.price && (
                  <p className="text-base font-bold text-purple-600 mb-2">
                    {favorite.product.price.toLocaleString()} so'm
                  </p>
                )}
                <Link
                  to={`/product/${favorite.product.id}`}
                  className="flex items-center justify-center space-x-2 w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{language === 'uz' ? 'Savatga qo\'shish' : 'В корзину'}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
