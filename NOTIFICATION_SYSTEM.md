# Real-Time Admin Notification System

## Overview

This system provides real-time notifications to administrators whenever orders are created, updated, cancelled, or completed. Notifications are delivered via Telegram and the admin dashboard using WebSocket.

## Features

- **Telegram Notifications**: Send notifications to admin groups, channels, or individual users
- **Real-Time Dashboard**: Live notifications via Socket.IO
- **Delivery Tracking**: Log all notification attempts with status
- **Retry Logic**: Automatic retry for failed notifications (max 3 attempts)
- **Multiple Channels**: Support for groups, channels, and individual users
- **Notification History**: View all sent notifications via admin API

## Notification Types

1. **NEW_ORDER**: When a customer places a new order
2. **ORDER_STATUS_CHANGE**: When order status changes (Pending → Processing, etc.)
3. **ORDER_CANCELLED**: When an order is cancelled
4. **ORDER_COMPLETED**: When an order is marked as completed

## Setup

### 1. Database Migration

The notification system requires the following database models:
- `AdminNotification`: Stores notification history
- `AdminConfig`: Stores admin configuration

These are already included in the schema. Run migrations if needed:

```bash
npm run prisma:migrate
```

### 2. Configure Admin Recipients

#### Option A: Using Environment Variables

Add these to your `.env` file:

```env
ADMIN_TELEGRAM_GROUP=-1001234567890
ADMIN_TELEGRAM_CHANNEL=@yourchannel
ADMIN_TELEGRAM_USERS=123456789,987654321
```

#### Option B: Using Setup Script

```bash
npx ts-node scripts/setupAdminNotifications.ts
```

#### Option C: Using Admin API

```bash
# Get current configuration
curl -H "x-admin-password: your_password" \
  http://localhost:8000/api/admin/notifications/config

# Update configuration
curl -X PUT -H "x-admin-password: your_password" \
  -H "Content-Type: application/json" \
  -d '{"key": "ADMIN_TELEGRAM_USERS", "value": "123456789,987654321"}' \
  http://localhost:8000/api/admin/notifications/config
```

### 3. Get Telegram Chat IDs

#### For Groups:
1. Add your bot to the group
2. Send a message to the group
3. Call: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find the `chat.id` (negative number for groups)

#### For Channels:
1. Add your bot as administrator to the channel
2. Use the channel username (e.g., @yourchannel) or ID
3. For private channels, use the channel ID from bot API

#### For Individual Users:
1. Start a conversation with your bot
2. Call: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Find the `message.from.id` (positive number)

## API Endpoints

### Notification Configuration

```bash
# Get all notification configurations
GET /api/admin/notifications/config

# Update notification configuration
PUT /api/admin/notifications/config
Body: { "key": "ADMIN_TELEGRAM_USERS", "value": "123456789", "description": "Admin users" }
```

### Notification History

```bash
# Get notification history
GET /api/admin/notifications/history?limit=50

# Get unread notification count
GET /api/admin/notifications/unread-count
```

## Web Dashboard Integration

The notification system is integrated into the web application:

1. **NotificationBell Component**: Shows notification badge in header
2. **NotificationContext**: Manages real-time notifications via Socket.IO
3. **Auto-connect**: Automatically connects to notification server on app load

### Socket.IO Events

- `join_admin`: Join admin notification room
- `admin_notification`: Receive new order notifications

## Testing

### Test Order Creation Notification

```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": 4, "quantity": 1}],
    "fullName": "Test Customer",
    "phoneNumber": "+998901234567"
  }'
```

### Test Status Change Notification

```bash
curl -X PUT http://localhost:8000/api/admin/orders/2/status \
  -H "x-admin-password: your_password" \
  -H "Content-Type: application/json" \
  -d '{"status": "PROCESSING"}'
```

## Notification Format

### New Order Notification

```
🛒 New Order Received

Order ID: #123
Customer: John Doe
Phone: +998901234567
Telegram: @johndoe
User ID: 123456789

Product: iPhone 15
Quantity: 2

Notes: Urgent delivery

Date: 2026-06-22 14:30
```

### Status Change Notification

```
📦 Order Status Updated

Order ID: #123
Status: ⏳ PENDING → PROCESSING

Customer: John Doe
Phone: +998901234567

Date: 2026-06-22 14:35
```

## Troubleshooting

### Notifications Not Received

1. **Check Configuration**: Verify admin recipients are configured correctly
2. **Check Bot Permissions**: Ensure bot has permission to send messages to groups/channels
3. **Check Logs**: View notification history via API to see delivery status
4. **Check Socket.IO**: Ensure WebSocket connection is established (check browser console)

### Socket.IO Connection Issues

1. Verify server is running on port 8000
2. Check CORS configuration in `src/server.ts`
3. Ensure `VITE_SOCKET_URL` is set correctly in web `.env`

### Telegram API Errors

1. Verify bot token is correct
2. Check if bot is blocked by recipients
3. Ensure bot is admin in channels
4. Check rate limits (Telegram has message rate limits)

## Files Modified

### Backend
- `src/services/notificationService.ts` - Core notification service
- `src/server.ts` - Socket.IO integration
- `src/index.ts` - HTTP server for Socket.IO
- `src/routes/public.ts` - Order creation notifications
- `src/routes/admin.ts` - Status change notifications & config endpoints
- `prisma/schema.prisma` - Database models for notifications

### Frontend
- `web/src/lib/socket.ts` - Socket.IO client
- `web/src/context/NotificationContext.tsx` - Notification state management
- `web/src/components/NotificationBell.tsx` - Notification UI component
- `web/src/App.tsx` - Notification provider integration
- `web/src/components/Layout.tsx` - Notification bell in header

### Scripts
- `scripts/setupAdminNotifications.ts` - Initial configuration script

## Environment Variables

```env
# Bot Configuration
BOT_TOKEN=your_bot_token

# Admin Notification Configuration
ADMIN_TELEGRAM_GROUP=-1001234567890
ADMIN_TELEGRAM_CHANNEL=@yourchannel
ADMIN_TELEGRAM_USERS=123456789,987654321

# Server Configuration
PORT=8000
NODE_ENV=development
```

## Security Notes

- Admin endpoints require authentication via `x-admin-password` header
- Telegram bot token should be kept secret
- Admin notification configuration should be restricted to authorized users
- Consider adding rate limiting for notification endpoints in production
