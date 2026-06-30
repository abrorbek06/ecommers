import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCategories, useProducts } from '../hooks/useApi';
import { Search, SlidersHorizontal, ChevronDown, Package, Heart, ShoppingCart } from 'lucide-react';

const CatalogPage = () => {
  const { t, language } = useLanguage();
  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [searchParams] = useSearchParams();
  const { data: categories } = useCategories();

  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

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

  // Use URL params directly instead of local state
  const selectedCategory = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!) : undefined;
  const searchQuery = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

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

  const { data, isLoading } = useProducts({
    page,
    limit: 20,
    categoryId: selectedCategory,
    search: searchQuery || undefined,
    sortBy,
    sortOrder,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    params.set('search', (e.target as HTMLFormElement).querySelector('input')?.value || '');
    window.location.href = `/catalog?${params.toString()}`;
  };

  const handleSort = (value: string) => {
    const newSortOrder = (sortBy === value && sortOrder === 'desc') ? 'asc' : 'desc';
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', value);
    params.set('sortOrder', newSortOrder);
    window.location.href = `/catalog?${params.toString()}`;
  };

  const handleCategoryChange = (categoryId?: number) => {
    const params = new URLSearchParams(searchParams);
    if (categoryId) {
      params.set('categoryId', categoryId.toString());
    } else {
      params.delete('categoryId');
    }
    window.location.href = `/catalog?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('catalog.title')}</h1>
        
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('catalog.search')}
              defaultValue={searchQuery}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 md:hidden"
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span>{t('catalog.filter')}</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Filters */}
        <aside className={`w-full md:w-64 ${showFilters ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-6">
            {/* Categories */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{t('home.categories')}</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleCategoryChange(undefined)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    !selectedCategory ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                  }`}
                >
                  {language === 'uz' ? 'Barchasi' : 'Все'}
                </button>
                {categories?.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    {category.name}
                    <span className="text-gray-400 text-sm ml-2">({category.productCount})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{t('catalog.sort')}</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleSort('createdAt')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                    sortBy === 'createdAt' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <span>{language === 'uz' ? 'Yangi' : 'Новые'}</span>
                  {sortBy === 'createdAt' && (
                    <ChevronDown className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </button>
                <button
                  onClick={() => handleSort('price')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                    sortBy === 'price' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <span>{language === 'uz' ? 'Narx' : 'Цена'}</span>
                  {sortBy === 'price' && (
                    <ChevronDown className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {isLoading ? (
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
          ) : data?.products && data.products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.products.map((product: any) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:scale-105 group relative"
                  >
                    {/* Badges */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                      <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium">
                        ORIGINAL
                      </span>
                    </div>

                    {/* Favorite Button */}
                    <button
                      className="absolute top-2 right-2 z-10 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                      onClick={(e) => toggleFavorite(e, product.id)}
                    >
                      <Heart className={`w-4 h-4 ${favorites.has(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'}`} />
                    </button>

                    {/* Product Image */}
                    <Link to={`/product/${product.id}`}>
                      <div className="aspect-square bg-gray-100 relative overflow-hidden">
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
                    <Link to={`/product/${product.id}`} className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-600 mb-2">{product.model.name}</p>
                      {product.price && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-bold text-purple-600">
                              {product.price.toLocaleString()} so'm
                            </p>
                            {/* <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded font-medium">
                              48%
                            </span> */}
                          </div>
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
                ))}
              </div>

              {/* Pagination */}
              {data.pagination && data.pagination.totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {language === 'uz' ? 'Oldingi' : 'Назад'}
                  </button>
                  <span className="px-4 py-2">
                    {page} / {data.pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page === data.pagination.totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {language === 'uz' ? 'Keyingi' : 'Вперед'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">{t('catalog.noResults')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogPage;