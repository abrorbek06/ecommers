# SalesBot - Production-Ready Telegram E-commerce Bot

A complete, production-ready Telegram bot for e-commerce with zero-config deployment on Ubuntu Server 24.04 LTS.

## 🚀 Quick Start

Deploy the bot with a single command:

```bash
git clone <repository>
cd <repository>
chmod +x one-click.sh
./one-click.sh
```

That's it! The bot will be fully operational after the script completes.

---

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Updating](#updating)
- [Backups](#backups)
- [Restoring](#restoring)
- [Logs](#logs)
- [Docker Commands](#docker-commands)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

- **Zero-Config Deployment**: One-command setup on Ubuntu Server
- **Automated SSL**: Let's Encrypt certificates with auto-renewal
- **Nginx Reverse Proxy**: Configured with security headers and compression
- **PostgreSQL Database**: Production-ready with automatic migrations
- **Redis Caching**: Built-in Redis for session management
- **Automatic Backups**: Daily database backups with retention policy
- **Health Monitoring**: Built-in health checks for all services
- **Multi-Language Support**: Uzbek and Russian languages
- **Admin Panel**: Web-based administration interface
- **File Upload**: Support for local and S3 storage
- **Rate Limiting**: Built-in API rate limiting
- **Security**: CORS, helmet, and security headers

---

## 🏗️ Architecture

### Tech Stack

- **Backend**: Node.js 20, TypeScript
- **Bot Framework**: Telegraf
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Web Server**: Express.js
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt
- **Containerization**: Docker & Docker Compose
- **ORM**: Prisma

### Services

- **Bot**: Main Telegram bot application
- **PostgreSQL**: Database server
- **Redis**: Caching layer
- **Nginx**: Reverse proxy with SSL termination

---

## 📦 Prerequisites

### For Ubuntu Server 24.04 LTS

- Fresh Ubuntu Server 24.04 LTS installation
- SSH access
- Sudo privileges
- Domain name (optional, for SSL)

The installation script will automatically install:
- Docker
- Docker Compose
- Git
- Nginx
- Certbot
- UFW Firewall

---

## 🔧 Installation

### One-Click Installation

This is the recommended method for production deployment:

```bash
# Clone the repository
git clone <repository>
cd <repository>

# Make the script executable
chmod +x one-click.sh

# Run the installation
./one-click.sh
```

The script will:
1. Install Docker, Docker Compose, Git, Nginx, and Certbot
2. Configure UFW firewall
3. Create required directories
4. Setup environment file
5. Validate environment variables
6. Build Docker images
7. Start all containers
8. Run database migrations
9. Seed database if needed
10. Obtain SSL certificates (if domain provided)
11. Configure Nginx
12. Register Telegram webhook
13. Verify all services
14. Setup automatic backups

### Manual Installation

If you prefer manual installation:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone <repository>
cd <repository>

# Setup environment
cp .env.example .env
nano .env  # Edit with your configuration

# Validate environment
chmod +x validate-env.sh
./validate-env.sh

# Start containers
docker compose up -d

# Run migrations
docker compose exec -T bot npx prisma migrate deploy

# Seed database (if needed)
docker compose exec -T bot npx prisma db seed
```

---

## ⚙️ Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_TOKEN` | Telegram bot token from @BotFather | `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `secure_password_123` |
| `ADMIN_PASSWORD` | Admin panel password | `admin_secure_password` |
| `UPLOAD_CHAT_ID` | Your Telegram chat ID for file uploads | `123456789` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WEBHOOK_URL` | Your domain for webhook mode | `""` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `""` |
| `STORAGE_TYPE` | File storage (local/s3) | `local` |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### AWS S3 Variables (if STORAGE_TYPE=s3)

| Variable | Description |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | AWS region |
| `AWS_S3_BUCKET` | S3 bucket name |

### Environment Files

- `.env.example` - Template with all variables
- `.env.development` - Development configuration
- `.env.production` - Production configuration
- `.env` - Active configuration (created from template)

---

## 🚢 Deployment

### Production Deployment

```bash
# Run the one-click deployment script
./one-click.sh
```

The script will prompt you for:
- Whether to use Nginx reverse proxy
- Whether to obtain SSL certificates
- Environment type (production/development)
- Bot token, passwords, and chat IDs
- Domain name (if using SSL)

### Development Deployment

For local development:

```bash
# Copy development environment
cp .env.development .env

# Edit with your configuration
nano .env

# Start containers
docker compose up -d

# View logs
docker compose logs -f
```

### With Nginx and SSL

To deploy with Nginx and SSL:

```bash
./one-click.sh
# Answer 'Y' to use Nginx
# Answer 'Y' to obtain SSL
# Provide your domain and email
```

---

## � Updating

### Automatic Update

```bash
# Pull latest code and update
./update.sh
```

This will:
1. Pull latest code from Git
2. Rebuild Docker containers
3. Restart services
4. Run migrations
5. Verify health
6. Update webhook
7. Clean unused images

### Manual Update

```bash
# Pull latest code
git pull

# Rebuild containers
docker compose build

# Restart services
docker compose up -d

# Run migrations
docker compose exec -T bot npx prisma migrate deploy
```

---

## 💾 Backups

### Manual Backup

```bash
# Create a backup
./backup.sh

# Create a backup without retention policy
./backup.sh manual
```

Backups are stored in the `backups/` directory with the format:
```
salesbot_backup_YYYYMMDD_HHMMSS.sql.gz
```

### Automatic Backups

The one-click installation script automatically sets up daily backups at 2 AM.

To view the cron job:
```bash
crontab -l
```

To manually add the cron job:
```bash
# Edit crontab
crontab -e

# Add this line
0 2 * * * cd /path/to/SalesBot && ./backup.sh >> /path/to/SalesBot/logs/backup.log 2>&1
```

### Backup Retention

By default, backups are retained for 7 days. To change this:

```bash
# Edit backup.sh
nano backup.sh

# Change RETENTION_DAYS value
RETENTION_DAYS=14  # Keep for 14 days
```

---

## 📥 Restoring

### Restore from Backup

```bash
# List available backups
ls -lh backups/

# Restore from a specific backup
./restore.sh salesbot_backup_20240101_120000.sql.gz
```

The restore process:
1. Stops the bot container
2. Drops and recreates the database
3. Restores data from backup
4. Restarts the bot container
5. Verifies the restore

---

## 📊 Logs

### View Logs

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f bot
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f nginx

# View last 100 lines
docker compose logs --tail=100
```

### Log Files

Application logs are stored in:
- `logs/backup.log` - Backup operation logs
- Docker container logs (via `docker compose logs`)

---

## 🐳 Docker Commands

### Container Management

```bash
# Start containers
docker compose up -d

# Stop containers
docker compose down

# Restart containers
docker compose restart

# Restart specific service
docker compose restart bot

# View container status
docker compose ps

# View resource usage
docker stats
```

### Image Management

```bash
# Build images
docker compose build

# Rebuild without cache
docker compose build --no-cache

# Remove unused images
docker image prune -a

# Remove all unused resources
docker system prune -a
```

### Database Operations

```bash
# Access PostgreSQL shell
docker compose exec postgres psql -U postgres -d salesbot

# Run Prisma migrations
docker compose exec -T bot npx prisma migrate deploy

# Seed database
docker compose exec -T bot npx prisma db seed

# Open Prisma Studio
docker compose exec -T bot npx prisma studio
```

---

## 🏥 Health Checks

### Health Endpoint

The bot exposes a health check endpoint:

```bash
# Check health
curl http://localhost:8000/health

# Response example
{
  "status": "healthy",
  "uptime": 3600.5,
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "2.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "latency": 5
    },
    "redis": {
      "status": "healthy",
      "latency": 2
    },
    "telegram": {
      "status": "healthy",
      "latency": 150
    }
  },
  "memory": {
    "used": 52428800,
    "total": 104857600,
    "percentage": 50
  }
}
```

### Service Health

```bash
# Check PostgreSQL
docker exec salesbot-postgres pg_isready -U postgres

# Check Redis
docker exec salesbot-redis redis-cli ping

# Check Bot container
docker exec sales-bot node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

---

## 🔧 Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker compose logs bot

# Check if port 8000 is in use
sudo lsof -i :8000

# Restart Docker daemon
sudo systemctl restart docker
```

### Database Connection Issues

```bash
# Check PostgreSQL container
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres

# Verify PostgreSQL is ready
docker exec salesbot-postgres pg_isready -U postgres
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Bot Not Responding

```bash
# Check bot logs
docker compose logs -f bot

# Verify bot token
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe

# Check webhook status
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo

# Clear webhook (for long polling mode)
docker compose exec bot npx ts-node -e "import { Telegraf } from 'telegraf'; const bot = new Telegraf(process.env.BOT_TOKEN); bot.telegram.deleteWebhook();"
```

### Permission Issues

```bash
# Fix directory permissions
sudo chown -R $USER:$USER uploads/
sudo chown -R $USER:$USER backups/
sudo chown -R $USER:$USER ssl/

# Fix Docker socket permissions
sudo chmod 666 /var/run/docker.sock
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker resources
docker system prune -a

# Remove old backups
find backups/ -name "salesbot_backup_*.sql.gz" -mtime +7 -delete
```

### Environment Validation

```bash
# Validate environment variables
./validate-env.sh

# Validate specific environment file
./validate-env.sh .env.production
```

---

## � Support

For issues and questions:

1. Check the troubleshooting section above
2. Validate your environment: `./validate-env.sh`
3. Check logs: `docker compose logs -f`
4. Review health status: `curl http://localhost:8000/health`

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 🔐 Security

- Change default passwords before production deployment
- Use strong PostgreSQL and admin passwords
- Enable SSL in production
- Keep dependencies updated
- Regularly review logs for suspicious activity
- Use firewall rules (UFW is configured by default)
- Keep backups in a secure location

---

## 📝 Version History

- **2.0.0** - Production-ready deployment with zero-config setup
- **1.0.0** - Initial release
