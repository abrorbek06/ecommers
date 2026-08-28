import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useApi';
import { ArrowRight, Package, Heart, Star, ShoppingCart } from 'lucide-react';
import { HeroBanner } from '../components/HeroBanner';
import { CategoryShortcuts } from '../components/CategoryShortcuts';
import { useState, useEffect } from 'react';

const HomePage = () => {
  const { language } = useLanguage();
  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const { data: allProducts, isLoading: allLoading } = useProducts({ page: 1, limit: 50 });
  const { data: newProducts, isLoading: newLoading } = useProducts({ page: 1, limit: 8, sortBy: 'createdAt', sortOrder: 'desc' });
  const { data: popularProducts, isLoading: popularLoading } = useProducts({ page: 1, limit: 8 });

  // Fetch user's favorites on mount
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchFavorites();
    }
  }, [isAuthenticated, user]);

  const fetchFavorites = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/favorites/user/${user?.id}?language=${language}`);
      const data = await response.json();
      const favoriteIds = new Set<number>(data.map((fav: any) => fav.productId));
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, productId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          productId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          if (data.favorited) {
            newFavorites.add(productId);
          } else {
            newFavorites.delete(productId);
          }
          return newFavorites;
        });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const ProductCard = ({ product }: { product: any }) => (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:scale-105 group relative">
      {/* Badges */}
      {/* <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium">
          ORIGINAL
        </span>
      </div> */}

      {/* Favorite Button */}
      <button
        className="absolute top-2 right-2 z-10 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
        onClick={(e) => toggleFavorite(e, product.id)}
      >
        <Heart className={`w-4 h-4 ${favorites.has(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'}`} />
      </button>

      {/* Product Image */}
      <Link to={`/product/${product.id}`}>
        <div className="aspect-square bg-gray-100 relative overflow-hidden p-4">
          {product.media && product.media.length > 0 ? (
            <img
              src={`${import.meta.env.VITE_API_URL}/image/${product.media[0].fileId}`}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-full h-full flex items-center justify-center ${product.media && product.media.length > 0 ? 'hidden' : ''}`}>
            <Package className="w-12 h-12 text-gray-400" />
          </div>
        </div>
      </Link>

      {/* Product Info */}
      <Link to={`/product/${product.id}`} className="p-4 flex flex-col">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm">
          {product.name}
        </h3>
        {/* <div className="flex items-center gap-1 mb-2">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-xs text-gray-600">4.5</span>
        </div> */}
        {product.price && (
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-purple-600">
              {product.price.toLocaleString()} so'm
            </p>
            <button
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCart({
                  productId: product.id,
                  quantity: 1,
                  name: product.name,
                  nameUz: product.nameUz,
                  nameRu: product.nameRu,
                  price: product.price,
                  image: product.media && product.media.length > 0 
                    ? `${import.meta.env.VITE_API_URL}/image/${product.media[0].fileId}` 
                    : undefined
                });
              }}
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          </div>
        )}
      </Link>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      {/* <HeroBanner
        title="BYD avtomobillari uchun asl ehtiyot qismlar"
        subtitle="Eng yaxshi narxlar va tezkor yetkazib berish kafolati bilan"
        badge="Reklama"
      /> */}

      {/* Category Shortcuts */}
      {/* <CategoryShortcuts language={language as 'uz' | 'ru'} /> */}

      {/* 🔥 Popular Products */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">🔥 Mashhur</h2>
          <Link
            to="/catalog"
            className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 font-medium text-sm"
          >
            <span>Barchasi</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {popularLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : popularProducts?.products && popularProducts.products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {popularProducts.products.slice(0, 8).map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </section>

      {/* 🆕 New Arrivals */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">🆕 Yangi mahsulotlar</h2>
          <Link
            to="/catalog?sortBy=createdAt&sortOrder=desc"
            className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 font-medium text-sm"
          >
            <span>Barchasi</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {newLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : newProducts?.products && newProducts.products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {newProducts.products.slice(0, 8).map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </section>

      {/* 💰 Discounted Products */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">💰 Chegirmalar</h2>
          <Link
            to="/catalog"
            className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 font-medium text-sm"
          >
            <span>Barchasi</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {allLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : allProducts?.products && allProducts.products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {allProducts.products.slice(0, 8).map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default HomePage;