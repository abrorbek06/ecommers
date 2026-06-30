import { Outlet, Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { NotificationBell } from './NotificationBell';
import { ShoppingCart, Search, Heart, User, Menu, Grid3X3 } from 'lucide-react';
import { useState } from 'react';
import { useCategories } from '../hooks/useApi';

const Layout = () => {
  const { cartCount } = useCart();
  const { language } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: categories } = useCategories();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/catalog?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Main Header */}
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-4">
              {/* Logo */}
              <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
                <span className="font-bold text-xl text-purple-600 hidden sm:block">Shop</span>
              </Link>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Mahsulotlar va turkumlar izlash"
                    className="w-full px-4 py-2.5 pl-10 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-sm"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </form>

              {/* Right Actions */}
              <div className="flex items-center space-x-2">
                <NotificationBell />
                <Link
                  to="/catalog"
                  className="hidden sm:flex items-center space-x-1 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg font-medium hover:bg-purple-100 transition-colors"
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span>Katalog</span>
                </Link>
                <Link
                  to="/favorites"
                  className="p-2 text-gray-700 hover:text-purple-600 transition-colors hidden sm:block"
                >
                  <Heart className="w-5 h-5" />
                </Link>
                <Link
                  to="/cart"
                  className="relative p-2 text-gray-700 hover:text-purple-600 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/profile"
                  className="p-2 text-gray-700 hover:text-purple-600 transition-colors hidden sm:block"
                >
                  <User className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="sm:hidden p-2 text-gray-700 hover:text-purple-600"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Horizontal Scrollable Category Tabs */}
          <div className="border-t bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center space-x-2 py-3 overflow-x-auto scrollbar-hide">
                {/* <Link
                  to="/catalog"
                  className="flex-shrink-0 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors whitespace-nowrap"
                >
                  Katalog
                </Link> */}
                {categories && categories.length > 0 ? (
                  categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/catalog?categoryId=${cat.id}`}
                      className="flex-shrink-0 px-4 py-2 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
                    >
                      {language === 'ru' ? cat.nameRu : cat.nameUz}
                    </Link>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">Yuklanmoqda...</span>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t bg-white">
              <div className="px-4 py-3 space-y-2">
                <Link
                  to="/catalog"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-purple-600 bg-purple-50"
                >
                  <Grid3X3 className="w-5 h-5" />
                  <span>Katalog</span>
                </Link>
                {categories?.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/catalog?categoryId=${cat.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-50"
                  >
                    <span>{language === 'ru' ? cat.nameRu : cat.nameUz}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>

        {/* Bottom Navigation (Mobile) */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-50">
          <div className="flex justify-around items-center h-16">
            <Link
              to="/"
              className={`flex flex-col items-center justify-center space-y-1 px-4 py-2 transition-colors ${
                location.pathname === '/' ? 'text-purple-600' : 'text-gray-600'
              }`}
            >
              <span className="text-xs">Bosh sahifa</span>
            </Link>
            <Link
              to="/catalog"
              className={`flex flex-col items-center justify-center space-y-1 px-4 py-2 transition-colors ${
                location.pathname === '/catalog' ? 'text-purple-600' : 'text-gray-600'
              }`}
            >
              <Grid3X3 className="w-5 h-5" />
              <span className="text-xs">Katalog</span>
            </Link>
            <Link
              to="/cart"
              className="relative flex flex-col items-center justify-center space-y-1 px-4 py-2 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-xs">Savat</span>
              {cartCount > 0 && (
                <span className="absolute top-1 right-2 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              to="/profile"
              className={`flex flex-col items-center justify-center space-y-1 px-4 py-2 transition-colors ${
                location.pathname === '/profile' ? 'text-purple-600' : 'text-gray-600'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-xs">Profil</span>
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Layout;