# BYD Parts E-commerce Web Application

A modern, mobile-first e-commerce web application for BYD spare parts, built with React, TypeScript, and Vite. This application integrates with the existing Telegram bot backend and provides a complete shopping experience.

## Features

- **🏠 Home Page**: Promotions, categories, and featured products
- **📦 Product Catalog**: Advanced search, filters, sorting, and pagination
- **🔍 Product Details**: Image galleries, descriptions, and specifications
- **🛒 Shopping Cart**: Local storage persistence with quantity management
- **💳 Checkout Flow**: Form validation and order submission
- **📱 Mobile-First Design**: Responsive layout with bottom tab navigation
- **🔐 Telegram Auth Integration**: Seamless authentication with existing Telegram users
- **📋 Order Tracking**: Real-time order status and history
- **👤 User Profile**: Account management and personal information
- **🌐 Multi-language Support**: Uzbek and Russian languages

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS (via CDN for development)
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Backend**: Express.js with Prisma ORM

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend server running on port 8000

### Installation

1. Navigate to the web directory:
```bash
cd web
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
VITE_API_URL=http://localhost:8000/api
VITE_BOT_TOKEN=your_telegram_bot_token_here
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
web/
├── src/
│   ├── components/       # Reusable components (Layout, etc.)
│   ├── context/         # React Context providers (Auth, Cart, Language)
│   ├── hooks/           # Custom React hooks (useApi, etc.)
│   ├── lib/             # Utility functions and API client
│   ├── pages/           # Page components (Home, Catalog, Product, etc.)
│   ├── App.tsx          # Main application component with routing
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Integration

The web application communicates with the backend through REST API endpoints:

- `GET /api/categories` - Get all vehicle models/categories
- `GET /api/products` - Get products with filters and pagination
- `GET /api/products/:id` - Get single product details
- `GET /api/search` - Search products
- `POST /api/orders` - Create new order
- `GET /api/orders/user/:userId` - Get user orders
- `GET /api/orders/:id` - Get order details
- `GET /api/user/:userId` - Get user profile
- `PUT /api/user/:userId` - Update user profile

## Environment Variables

- `VITE_API_URL` - Backend API base URL
- `VITE_BOT_TOKEN` - Telegram bot token for media file access

## Features in Detail

### Authentication
- Telegram widget login integration
- Session persistence via localStorage
- User profile management

### Shopping Experience
- Product browsing with advanced filters
- Shopping cart with local storage
- Quick checkout process
- Order tracking and history

### Responsive Design
- Mobile-first approach
- Bottom navigation bar for mobile
- Adaptive grid layouts
- Touch-friendly interface

### Internationalization
- Uzbek and Russian language support
- Easy language switching
- Consistent translations across all pages

## Development Notes

- The backend API must be running for the web application to function
- Telegram media files are accessed using the bot token
- Cart data is persisted in localStorage for better UX
- All API requests include language preference automatically
