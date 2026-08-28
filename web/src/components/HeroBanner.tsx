import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface HeroBannerProps {
  title: string;
  subtitle: string;
  image?: string;
  link?: string;
  badge?: string;
}

export function HeroBanner({ title, subtitle, image, link = '/catalog', badge = 'Reklama' }: HeroBannerProps) {
  return (
    <div className="relative bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl overflow-hidden mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Content */}
          <div className="flex-1">
            <span className="inline-block bg-purple-200 text-purple-700 text-xs px-3 py-1 rounded-full font-medium mb-4">
              {badge}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {title}
            </h2>
            <p className="text-gray-600 mb-4">
              {subtitle}
            </p>
            <Link
              to={link}
              className="inline-flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Image */}
          {image && (
            <div className="flex-shrink-0">
              <img
                src={image}
                alt={title}
                className="w-full md:w-96 h-48 md:h-64 object-cover rounded-xl"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
