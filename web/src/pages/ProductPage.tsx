import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useProduct } from '../hooks/useApi';
import { ArrowLeft, Plus, Minus, ShoppingCart, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: product, isLoading, error } = useProduct(parseInt(id!));

  const handleAddToCart = () => {
    if (product) {
      addToCart({
        productId: product.id,
        quantity,
        name: product.name,
        nameUz: product.nameUz,
        nameRu: product.nameRu,
        price: product.price,
        image: product.media && product.media.length > 0 
          ? `${import.meta.env.VITE_API_URL}/image/${product.media[0].fileId}`
          : undefined,
      });
      navigate('/cart');
    }
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  const nextImage = () => {
    if (product && product.media && product.media.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % product.media.length);
    }
  };

  const prevImage = () => {
    if (product && product.media && product.media.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + product.media.length) % product.media.length);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-gray-200 rounded-xl mb-6"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">{t('common.error')}</p>
        <Link to="/catalog" className="text-blue-600 hover:text-blue-700">
          {t('catalog.title')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        to="/catalog"
        className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>{t('common.back')}</span>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative">
            {product.media && product.media.length > 0 ? (
              <>
                <img
                  src={`${import.meta.env.VITE_API_URL}/image/${product.media[currentImageIndex].fileId}`}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-gray-400" />
                </div>
                {product.media.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-md"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-24 h-24 text-gray-400" />
              </div>
            )}
          </div>
          
          {/* Thumbnails */}
          {product.media && product.media.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {product.media.map((media, index) => (
                <button
                  key={media.id}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    index === currentImageIndex ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <img
                    src={`${import.meta.env.VITE_API_URL}/image/${media.fileId}`}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden w-full h-full flex items-center justify-center bg-gray-200">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-blue-600 font-medium mb-2">{product.model.name}</p>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            {product.price && (
              <p className="text-3xl font-bold text-blue-600">
                {product.price.toLocaleString()} so'm
              </p>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h2 className="font-semibold text-gray-900 mb-3">{t('product.description')}</h2>
              <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center space-x-4">
            <span className="font-medium text-gray-900">{t('product.quantity')}:</span>
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="px-4 py-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="px-6 py-2 font-medium">{quantity}</span>
              <button
                onClick={() => handleQuantityChange(1)}
                className="px-4 py-2 hover:bg-gray-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            <ShoppingCart className="w-6 h-6" />
            <span>{t('product.addtocart')}</span>
          </button>

          {/* Product Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-600 mb-1">{language === 'uz' ? 'Model' : 'Модель'}</p>
              <p className="font-medium text-gray-900">{product.model.name}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-600 mb-1">{language === 'uz' ? 'Mahsulot ID' : 'ID товара'}</p>
              <p className="font-medium text-gray-900">#{product.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;