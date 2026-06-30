# SalesBot Deployment Documentation

Complete guide for deploying, maintaining, and troubleshooting SalesBot on Ubuntu Server 24.04 LTS.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Requirements](#2-system-requirements)
3. [Prerequisites](#3-prerequisites)
4. [First-Time Installation](#4-first-time-installation)
5. [Environment Variables](#5-environment-variables)
6. [Deployment Process](#6-deployment-process)
7. [Updating the Project](#7-updating-the-project)
8. [Database](#8-database)
9. [Docker](#9-docker)
10. [Nginx](#10-nginx)
11. [SSL](#11-ssl)
12. [Telegram Webhook](#12-telegram-webhook)
13. [Health Monitoring](#13-health-monitoring)
14. [Logging](#14-logging)
15. [Backup](#15-backup)
16. [Restore](#16-restore)
17. [Troubleshooting](#17-troubleshooting)
18. [Maintenance](#18-maintenance)
19. [Security](#19-security)
20. [Production Checklist](#20-production-checklist)
21. [Quick Commands](#21-quick-commands)
22. [Disaster Recovery](#22-disaster-recovery)
23. [Conclusion](#23-conclusion)

---

## 1. Project Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User                                │
└────────────────────┬──────────────────────────────────────┘
                     │
                     │ HTTPS (443)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Nginx                                  │
│  - SSL Termination (Let's Encrypt)                          │
│  - Reverse Proxy                                            │
│  - Security Headers                                         │
│  - Gzip Compression                                         │
└────────────────────┬──────────────────────────────────────┘
                     │
                     │ HTTP (8000)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    SalesBot Container                        │
│  - Node.js 20 + TypeScript                                  │
│  - Telegraf (Telegram Bot Framework)                        │
│  - Express.js (Web Server)                                  │
│  - Prisma ORM                                               │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├─────────────────┬──────────────────┐
       │                 │                  │
       ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ PostgreSQL   │  │    Redis     │  │   Telegram   │
│   Container  │  │   Container  │  │     API      │
│              │  │              │  │              │
│ - Database   │  │ - Caching    │  │ - Webhook    │
│ - Migrations │  │ - Sessions   │  │ - Messages   │
│ - Data       │  │ - Rate Limit │  │ - Updates    │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Technologies Used

| Component | Technology | Version |
|-----------|-----------|---------|
| **Backend** | Node.js | 20 |
| **Language** | TypeScript | 5.x |
| **Bot Framework** | Telegraf | 4.x |
| **Web Server** | Express.js | 4.x |
| **Database** | PostgreSQL | 15 |
| **Cache** | Redis | 7 |
| **ORM** | Prisma | 6.x |
| **Reverse Proxy** | Nginx | Latest |
| **SSL** | Let's Encrypt | Certbot |
| **Containerization** | Docker | Latest |
| **Orchestration** | Docker Compose | 2.x |

### Folder Structure

```
SalesBot/
├── prisma/
│   ├── migrations/              # Database migrations
│   ├── schema.prisma            # Database schema
│   └── seed.ts                  # Database seeding
├── src/
│   ├── bot/                     # Telegram bot logic
│   │   ├── handlers/            # Command handlers
│   │   ├── middleware/          # Bot middleware
│   │   ├── context.ts           # Type definitions
│   │   └── keyboards.ts         # Keyboard layouts
│   ├── config/                  # Configuration
│   ├── database/                # Database client
│   ├── services/                # Business logic
│   ├── index.ts                 # Application entry
│   └── server.ts                # Express server
├── backups/                    # Database backups
├── logs/                        # Application logs
├── ssl/                         # SSL certificates
├── uploads/                     # File uploads
├── scripts/                     # Utility scripts
├── web/                         # React web app
├── docker-compose.yml           # Docker orchestration
├── Dockerfile                   # Container build
├── nginx.conf                   # Nginx configuration
├── one-click.sh                 # One-click deployment
├── update.sh                    # Update script
├── backup.sh                    # Backup script
├── restore.sh                   # Restore script
├── validate-env.sh              # Environment validator
├── .env.example                 # Environment template
├── .env.production              # Production config
├── .env.development             # Development config
└── DEPLOYMENT.md                # This document
```

### Production Stack

- **Operating System**: Ubuntu Server 24.04 LTS
- **Container Runtime**: Docker + Docker Compose
- **Web Server**: Nginx (reverse proxy)
- **SSL**: Let's Encrypt (auto-renewing)
- **Database**: PostgreSQL 15 (Docker)
- **Cache**: Redis 7 (Docker)
- **Application**: Node.js 20 + TypeScript (Docker)
- **Firewall**: UFW (Uncomplicated Firewall)

---

## 2. System Requirements

### Minimum Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **Ubuntu Version** | 22.04 LTS | 24.04 LTS |
| **CPU** | 1 core | 2+ cores |
| **RAM** | 2 GB | 4+ GB |
| **Disk** | 20 GB | 50+ GB SSD |
| **Internet** | 1 Mbps | 10+ Mbps |

### Domain Requirements

- **Domain Name**: Required for SSL certificates (e.g., `bot.example.com`)
- **DNS Configuration**: A record pointing to server IP
- **Port Requirements**: 
  - Port 22 (SSH)
  - Port 80 (HTTP)
  - Port 443 (HTTPS)

### Static IP vs Dynamic DNS

| Option | Description | Recommendation |
|--------|-------------|----------------|
| **Static IP** | Fixed IP address from ISP | **Recommended** for production |
| **Dynamic DNS** | Dynamic IP with DDNS service | Acceptable for testing |

For production, a static IP is recommended to avoid DNS propagation issues. If using dynamic DNS, ensure your DDNS service updates frequently.

---

## 3. Prerequisites

### Before You Begin

You must have the following ready before deployment:

#### 1. Telegram Bot Token

- Create a bot via [@BotFather](https://t.me/BotFather) on Telegram
- Save the bot token (format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
- Set bot commands and description via BotFather

#### 2. Domain Name

- Purchase a domain from a registrar (e.g., Namecheap, GoDaddy)
- Configure DNS A record to point to your server IP
- Wait for DNS propagation (usually 5-30 minutes)

#### 3. GitHub Repository

- Fork or clone the SalesBot repository
- Ensure you have SSH access to the repository
- Or have the repository URL ready for cloning

#### 4. Server Access

- SSH access to Ubuntu Server
- User account with sudo privileges
- SSH key-based authentication (recommended)

#### 5. Your Telegram Chat ID

- Message [@userinfobot](https://t.me/userinfobot) on Telegram
- Save your numeric chat ID for file uploads

#### 6. Firewall Requirements

The installation script automatically configures UFW, but ensure:
- Port 22 is open for SSH
- Ports 80 and 443 will be opened by the script
- No other services are blocking these ports

---

## 4. First-Time Installation

### Step-by-Step Installation

Follow these exact steps to deploy SalesBot on a fresh Ubuntu Server:

#### Step 1: Connect to Your Server

```bash
ssh your-user@your-server-ip
```

#### Step 2: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

#### Step 3: Clone the Repository

```bash
# Clone the repository
git clone <your-repository-url>
cd SalesBot
```

#### Step 4: Make Scripts Executable

```bash
chmod +x one-click.sh update.sh backup.sh restore.sh validate-env.sh
```

#### Step 5: Run One-Click Installation

```bash
./one-click.sh
```

#### Step 6: Follow the Prompts

The script will ask you:

1. **Use Nginx reverse proxy?** (Y/n)
   - Press `Y` for production (recommended)
   - Press `n` for development without Nginx

2. **Obtain SSL certificate?** (Y/n)
   - Press `Y` if you have a domain (recommended)
   - Press `n` if using IP address only

3. **Environment** (production/development) [production]:
   - Press `Enter` for production
   - Type `development` for development mode

4. **Bot Token**:
   - Paste your Telegram bot token from @BotFather

5. **PostgreSQL Password**:
   - Enter a secure password (minimum 8 characters)

6. **Admin Password**:
   - Enter a secure password for the admin panel

7. **Upload Chat ID**:
   - Enter your Telegram chat ID from @userinfobot

8. **Domain Name** (if using SSL):
   - Enter your domain (e.g., `bot.example.com`)

9. **Email for Let's Encrypt** (if using SSL):
   - Enter your email for SSL notifications

### What Happens Automatically

The `one-click.sh` script performs these steps automatically:

1. **Install Dependencies**
   - Docker
   - Docker Compose
   - Git
   - Nginx (if enabled)
   - Certbot (if SSL enabled)

2. **Configure Firewall**
   - Enable UFW
   - Allow SSH (port 22)
   - Allow HTTP (port 80)
   - Allow HTTPS (port 443)

3. **Create Directories**
   - `uploads/` - File uploads
   - `ssl/` - SSL certificates
   - `backups/` - Database backups
   - `logs/` - Application logs

4. **Setup Environment**
   - Copy appropriate `.env` file
   - Prompt for configuration
   - Validate environment variables

5. **Build Containers**
   - Build Docker images
   - Create Docker volumes
   - Create Docker networks

6. **Start Services**
   - Start PostgreSQL container
   - Start Redis container
   - Start Bot container
   - Start Nginx container (if enabled)

7. **Database Setup**
   - Wait for PostgreSQL to be healthy
   - Run Prisma migrations
   - Seed database if needed

8. **SSL Configuration** (if enabled)
   - Obtain Let's Encrypt certificate
   - Configure Nginx with SSL
   - Setup auto-renewal

9. **Webhook Registration**
   - Register Telegram webhook (if WEBHOOK_URL set)

10. **Verification**
    - Verify health endpoint
    - Verify PostgreSQL connection
    - Verify Telegram connection

11. **Backup Setup**
    - Setup automatic daily backups
    - Configure retention policy

12. **Success Summary**
    - Display deployment status
    - Show access URLs
    - List useful commands

### Post-Installation Steps

After installation completes:

1. **Log out and back in** (if Docker was just installed)
   ```bash
   exit
   ssh your-user@your-server-ip
   ```

2. **Verify the bot is running**
   ```bash
   cd SalesBot
   docker compose ps
   ```

3. **Check health status**
   ```bash
   curl http://localhost:8000/health
   ```

4. **Test the bot on Telegram**
   - Search for your bot by username
   - Send `/start` command
   - Verify it responds

---

## 5. Environment Variables

### Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `BOT_TOKEN` | Telegram bot token from @BotFather | `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` | Yes |
| `POSTGRES_PASSWORD` | PostgreSQL database password | `secure_password_123` | Yes |
| `ADMIN_PASSWORD` | Admin panel password | `admin_secure_password` | Yes |
| `UPLOAD_CHAT_ID` | Your Telegram chat ID for file uploads | `123456789` | Yes |

### Optional Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `WEBHOOK_URL` | Your domain for webhook mode | `""` | No |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `""` | No |
| `STORAGE_TYPE` | File storage type (`local` or `s3`) | `local` | No |
| `STORAGE_PATH` | Local storage path | `./uploads` | No |
| `LOG_LEVEL` | Logging level (`debug`, `info`, `warn`, `error`) | `info` | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit time window in milliseconds | `900000` | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per rate limit window | `100` | No |

### AWS S3 Variables (if STORAGE_TYPE=s3)

| Variable | Description | Required |
|----------|-------------|----------|
| `AWS_ACCESS_KEY_ID` | AWS access key ID | Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key | Yes |
| `AWS_REGION` | AWS region (e.g., `us-east-1`) | Yes |
| `AWS_S3_BUCKET` | S3 bucket name | Yes |

### OTP Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `OTP_EXPIRY_MINUTES` | OTP code expiry time in minutes | `5` |
| `OTP_MAX_ATTEMPTS` | Maximum OTP verification attempts | `3` |
| `OTP_RATE_LIMIT_MINUTES` | OTP rate limit window in minutes | `1` |
| `OTP_MAX_REQUESTS_PER_MINUTE` | Max OTP requests per minute | `3` |
| `OTP_LENGTH` | OTP code length | `6` |

### Complete .env.example

```bash
# Telegram Bot Settings
# Get your bot token from @BotFather on Telegram
BOT_TOKEN="your_bot_token_here"

# Database Connection (PostgreSQL)
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/salesbot_dev"

# Redis Connection
REDIS_URL="redis://localhost:6379"

# Server Settings
PORT=8000
NODE_ENV="development"

# Webhook Settings (Required in production)
# Set this to your domain for production deployment
# Example: WEBHOOK_URL="https://bot.example.com"
WEBHOOK_URL=""

# Admin Dashboard Settings
# Change this to a secure password in production
ADMIN_PASSWORD="admin"

# File Upload: Your personal Telegram chat ID or a private group chat ID.
# The bot will temporarily send uploaded files there to get a Telegram fileId.
# To find your ID: message @userinfobot on Telegram.
# Example: UPLOAD_CHAT_ID="123456789"
UPLOAD_CHAT_ID="your_upload_chat_id"

# OTP Verification Settings
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3
OTP_RATE_LIMIT_MINUTES=1
OTP_MAX_REQUESTS_PER_MINUTE=3
OTP_LENGTH=6

# File Storage Settings
# Options: local, s3
STORAGE_TYPE="local"
STORAGE_PATH="./uploads"

# AWS S3 Settings (required only if STORAGE_TYPE=s3)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
AWS_S3_BUCKET=""

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
# Options: debug, info, warn, error
LOG_LEVEL="debug"

# Security Settings
# Comma-separated list of allowed origins for CORS
# Example: ALLOWED_ORIGINS="https://example.com,https://www.example.com"
ALLOWED_ORIGINS=""

# PostgreSQL Password (for Docker Compose)
# This must match the password in DATABASE_URL
POSTGRES_PASSWORD="postgres"
```

### Environment Files

- **`.env.example`** - Template with all variables and documentation
- **`.env.development`** - Pre-configured for development
- **`.env.production`** - Pre-configured for production
- **`.env`** - Active configuration (created from template)

### Validating Environment

Before deployment, validate your environment:

```bash
./validate-env.sh

# Or validate a specific file
./validate-env.sh .env.production
```

---

## 6. Deployment Process

### What one-click.sh Does Internally

The `one-click.sh` script performs the following automated steps:

#### Phase 1: Dependency Installation

1. **Check for Docker**
   - If missing: Install Docker from official repository
   - Add user to docker group
   - Enable Docker service

2. **Check for Docker Compose**
   - If missing: Install Docker Compose standalone
   - Verify installation

3. **Check for Git**
   - If missing: Install Git via apt

4. **Install Nginx** (if enabled)
   - Install Nginx via apt
   - Enable Nginx service

5. **Install Certbot** (if SSL enabled)
   - Install Certbot and Python plugin
   - Verify installation

6. **Configure UFW Firewall**
   - Enable UFW
   - Allow SSH (port 22)
   - Allow HTTP (port 80)
   - Allow HTTPS (port 443)

#### Phase 2: Environment Setup

7. **Create Directories**
   - `uploads/` - For file uploads
   - `ssl/` - For SSL certificates
   - `backups/` - For database backups
   - `logs/` - For application logs

8. **Setup Environment File**
   - Copy appropriate template (`.env.production` or `.env.development`)
   - Prompt for required variables
   - Update `.env` file with user input

9. **Validate Environment**
   - Check all required variables are set
   - Validate password strength
   - Validate URL formats
   - Check production-specific requirements

#### Phase 3: Container Deployment

10. **Build Docker Images**
    - Build bot image with all dependencies
    - Build uses multi-stage Dockerfile
    - Optimized for production

11. **Start Containers**
    - Start PostgreSQL container
    - Start Redis container
    - Start Bot container
    - Start Nginx container (if enabled)
    - All containers use `restart: unless-stopped`

12. **Wait for PostgreSQL**
    - Poll PostgreSQL health check
    - Wait up to 60 seconds for healthy status
    - Exit if PostgreSQL doesn't become healthy

#### Phase 4: Database Setup

13. **Run Migrations**
    - Execute Prisma migrations
    - Uses `prisma migrate deploy`
    - Applies all pending migrations

14. **Seed Database** (if needed)
    - Check if products exist
    - If empty, run seed script
    - Creates default admin user
    - Creates sample categories and products

#### Phase 5: SSL Configuration (if enabled)

15. **Obtain SSL Certificate**
    - Create webroot for Certbot
    - Request certificate from Let's Encrypt
    - Save certificate to `ssl/` directory

16. **Configure Nginx**
    - Copy SSL certificates to project
    - Set proper permissions
    - Test Nginx configuration
    - Restart Nginx

17. **Setup SSL Auto-Renewal**
    - Create renewal hook script
    - Add cron job for renewal
    - Cert renews every 12 hours

#### Phase 6: Webhook Registration

18. **Register Telegram Webhook**
    - Check if WEBHOOK_URL is set
    - If set, webhook registers automatically on bot startup
    - Bot calls `setWebhook` with full URL

#### Phase 7: Verification

19. **Verify Health Endpoint**
    - Poll `/health` endpoint
    - Wait up to 60 seconds for response
    - Check response status code

20. **Verify PostgreSQL**
    - Execute `pg_isready` command
    - Confirm database is accessible

21. **Verify Telegram**
    - Call Telegram API `getMe`
    - Confirm bot token is valid
    - Display bot username

#### Phase 8: Backup Setup

22. **Setup Automatic Backups**
    - Create cron job for daily backup
    - Schedule for 2 AM daily
    - Log output to `logs/backup.log`

#### Phase 9: Cleanup

23. **Clean Docker Images**
    - Remove unused Docker images
    - Free up disk space

#### Phase 10: Summary

24. **Print Success Summary**
    - Display deployment status
    - Show service health
    - List access URLs
    - Show useful commands

### Idempotency

The script is idempotent - it can be run multiple times safely:
- Checks if dependencies are already installed
- Skips installation if already present
- Validates existing configuration
- Only makes changes when necessary

---

## 7. Updating the Project

### Automatic Update

The recommended way to update is using the `update.sh` script:

```bash
cd SalesBot
./update.sh
```

### What update.sh Does

The `update.sh` script performs these steps:

1. **Pull Latest Code**
   - Checks if in Git repository
   - Stashes uncommitted changes (with confirmation)
   - Pulls latest code from remote
   - Supports `main`, `master`, or default branch

2. **Rebuild Containers**
   - Builds new Docker images
   - Uses latest code from repository
   - Rebuilds all services

3. **Restart Services**
   - Stops running containers
   - Starts new containers
   - Supports Nginx profile if enabled

4. **Run Migrations**
   - Executes any new Prisma migrations
   - Uses `prisma migrate deploy`
   - Applies only pending migrations

5. **Verify Health**
   - Polls health endpoint
   - Waits up to 60 seconds for response
   - Confirms services are healthy

6. **Update Webhook**
   - Checks if WEBHOOK_URL is set
   - Webhook updates automatically on bot startup

7. **Clean Images**
   - Removes unused Docker images
   - Frees up disk space

### Manual Update

If you prefer manual updates:

```bash
# Pull latest code
git pull

# Rebuild containers
docker compose build

# Restart services
docker compose up -d

# Run migrations
docker compose exec -T bot npx prisma migrate deploy

# Verify health
curl http://localhost:8000/health
```

### Update Frequency

Recommended update schedule:
- **Weekly**: Check for updates
- **Monthly**: Apply security updates
- **As needed**: When new features are released

### Rollback

If an update causes issues:

```bash
# View previous commits
git log --oneline

# Rollback to previous version
git checkout <previous-commit-hash>

# Rebuild and restart
docker compose build
docker compose up -d
```

---

## 8. Database

### PostgreSQL

SalesBot uses PostgreSQL 15 as the primary database, running in a Docker container.

#### Database Connection

- **Host**: `postgres` (Docker network) or `localhost` (from host)
- **Port**: `5432`
- **Database**: `salesbot` (or `salesbot_prod` in production)
- **User**: `postgres`
- **Password**: Set via `POSTGRES_PASSWORD` environment variable

#### Connection String Format

```
postgresql://postgres:PASSWORD@HOST:5432/DATABASE
```

Examples:
- Development: `postgresql://postgres:postgres@localhost:5432/salesbot_dev`
- Production: `postgresql://postgres:secure_password@postgres:5432/salesbot_prod`

### Migrations

Database migrations are managed by Prisma.

#### Running Migrations

```bash
# Run pending migrations (production)
docker compose exec -T bot npx prisma migrate deploy

# Create a new migration (development)
docker compose exec -T bot npx prisma migrate dev --name migration_name

# Reset database (development only)
docker compose exec -T bot npx prisma migrate reset
```

#### Migration Files

Migrations are stored in `prisma/migrations/`:
```
prisma/migrations/
├── 20260620140450_init/
│   └── migration.sql
├── 20260620204353_add_orders/
│   └── migration.sql
└── 20260621195819_add_activity_tracking/
    └── migration.sql
```

### Seeds

Database seeding populates the database with initial data.

#### Running Seeds

```bash
# Run seed script
docker compose exec -T bot npx prisma db seed
```

#### What Seeds Create

- Default admin user (ID: 123456789)
- Confirm channel (@DevlogUz)
- 9 product categories (VehicleModels)
- Sample products for each category

#### Seed File

Location: `prisma/seed.ts`

### Prisma

Prisma is the ORM used for database operations.

#### Prisma Client

The Prisma Client is auto-generated from the schema:
```bash
# Generate Prisma Client
docker compose exec -T bot npx prisma generate
```

#### Prisma Studio

Prisma Studio is a visual database editor:

```bash
# Open Prisma Studio
docker compose exec -T bot npx prisma studio
```

Access at: `http://localhost:5555`

#### Prisma Schema

The database schema is defined in `prisma/schema.prisma`:
- Defines all models
- Defines relationships
- Defines indexes

#### Database Operations

```bash
# Access PostgreSQL shell
docker compose exec postgres psql -U postgres -d salesbot

# View all tables
\dt

# View table structure
\d table_name

# Run SQL query
SELECT * FROM "TelUser" LIMIT 10;

# Exit PostgreSQL
\q
```

### Database Backup

See [Backup](#15-backup) section for backup procedures.

---

## 9. Docker

### Containers

SalesBot runs multiple Docker containers:

| Container | Image | Purpose | Ports |
|-----------|-------|---------|-------|
| `sales-bot` | Custom | Main application | 8000 |
| `salesbot-postgres` | postgres:15-alpine | Database | 5432 |
| `salesbot-redis` | redis:7-alpine | Cache | 6379 |
| `salesbot-nginx` | nginx:alpine | Reverse proxy | 80, 443 |

### Container Management

```bash
# View running containers
docker compose ps

# View all containers (including stopped)
docker ps -a

# Start containers
docker compose up -d

# Stop containers
docker compose down

# Restart containers
docker compose restart

# Restart specific container
docker compose restart bot

# Stop and remove containers (including volumes)
docker compose down -v
```

### Volumes

Docker volumes persist data beyond container lifecycle:

| Volume | Purpose | Location |
|--------|---------|----------|
| `postgres-data` | PostgreSQL data | Docker managed |
| `redis-data` | Redis data | Docker managed |
| `bot-uploads` | File uploads | Docker managed |

#### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect salesbot_postgres-data

# Remove volume (WARNING: deletes data)
docker volume rm salesbot_postgres-data
```

### Networks

Containers communicate via Docker network:

| Network | Purpose | Driver |
|---------|---------|--------|
| `salesbot-network` | Inter-container communication | bridge |

#### Network Management

```bash
# List networks
docker network ls

# Inspect network
docker network inspect salesbot_salesbot-network

# View network connections
docker network inspect salesbot_salesbot-network | grep Containers
```

### Restart Policies

All containers use `restart: unless-stopped`:
- Containers restart automatically on failure
- Containers restart after server reboot
- Containers don't restart if manually stopped

### Health Checks

Each container has health checks:

#### Bot Container
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

#### PostgreSQL Container
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 10s
  timeout: 5s
  retries: 5
```

#### Redis Container
```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
```

#### Viewing Health Status

```bash
# View container health
docker compose ps

# View health check logs
docker inspect sales-bot | grep -A 10 Health
```

### Useful Docker Commands

```bash
# View container logs
docker compose logs -f

# View specific service logs
docker compose logs -f bot
docker compose logs -f postgres
docker compose logs -f redis

# View last 100 lines
docker compose logs --tail=100

# View resource usage
docker stats

# Execute command in container
docker compose exec bot sh
docker compose exec postgres psql -U postgres

# Copy file from container
docker cp sales-bot:/app/file.txt .

# Copy file to container
docker cp file.txt sales-bot:/app/

# View container details
docker inspect sales-bot

# View container processes
docker top sales-bot
```

### Image Management

```bash
# Build images
docker compose build

# Rebuild without cache
docker compose build --no-cache

# List images
docker images

# Remove unused images
docker image prune

# Remove all unused images
docker image prune -a

# Remove specific image
docker rmi sales-bot:latest
```

### Docker System Cleanup

```bash
# Remove unused containers, networks, images
docker system prune

# Remove everything (including volumes)
docker system prune -a --volumes

# View disk usage
docker system df
```

---

## 10. Nginx

### Reverse Proxy

Nginx acts as a reverse proxy, handling:
- SSL termination
- Request routing
- Static file serving
- Load balancing (future)

### Configuration

Nginx configuration is in `nginx.conf`:

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name _;
    
    # SSL certificates
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # Proxy to bot
    location / {
        proxy_pass http://bot:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### HTTPS

Nginx handles HTTPS with:
- TLS 1.2 and 1.3
- Strong cipher suites
- HSTS header
- SSL session caching

### Security Headers

Nginx adds security headers:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Compression

Nginx compresses responses with gzip:

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript 
           application/json application/javascript application/xml+rss;
```

### Rate Limiting

Nginx implements rate limiting:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;
```

### Managing Nginx

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo nginx -s reload

# Restart Nginx
sudo systemctl restart nginx

# View Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

### Nginx Profile

Nginx is optional and uses Docker Compose profiles:

```bash
# Start with Nginx
docker compose --profile with-nginx up -d

# Start without Nginx
docker compose up -d
```

---

## 11. SSL

### Let's Encrypt

SSL certificates are obtained from Let's Encrypt using Certbot.

#### Certificate Obtaining

The `one-click.sh` script automatically:
1. Creates webroot for ACME challenge
2. Requests certificate from Let's Encrypt
3. Saves certificates to `ssl/` directory
4. Configures Nginx with SSL

#### Certificate Locations

Certificates are stored in:
- `ssl/fullchain.pem` - Full certificate chain
- `ssl/privkey.pem` - Private key
- `ssl/chain.pem` - Certificate chain

#### Manual Certificate Request

If you need to manually obtain a certificate:

```bash
# Create webroot
sudo mkdir -p /var/www/certbot

# Request certificate
sudo certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email your@email.com \
    --agree-tos \
    --no-eff-email \
    -d bot.example.com

# Copy certificates
sudo cp /etc/letsencrypt/live/bot.example.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/bot.example.com/privkey.pem ssl/
sudo cp /etc/letsencrypt/live/bot.example.com/chain.pem ssl/
sudo chown -R $USER:$USER ssl/
```

### Auto Renewal

SSL certificates auto-renew every 12 hours via cron:

```bash
# View renewal cron job
crontab -l | grep certbot
```

The renewal hook:
1. Renews certificate
2. Copies new certificates to `ssl/`
3. Restarts Nginx

#### Manual Renewal

```bash
# Renew certificates
sudo certbot renew

# Renew with dry run
sudo certbot renew --dry-run
```

#### Certificate Status

```bash
# View certificate details
sudo certbot certificates

# View certificate expiration
sudo certbot certificates | grep Expiry
```

### Certificate Troubleshooting

If SSL fails:

```bash
# Check certificate validity
openssl x509 -in ssl/fullchain.pem -text -noout

# Check certificate expiration
openssl x509 -in ssl/fullchain.pem -noout -dates

# Test SSL configuration
openssl s_client -connect bot.example.com:443
```

---

## 12. Telegram Webhook

### Registration

The Telegram webhook is registered automatically when:
- `WEBHOOK_URL` is set in `.env`
- The bot container starts

The bot calls `setWebhook` with the full URL:
```
https://your-domain.com/blog/webhook/
```

### Verification

Verify webhook status:

```bash
# Check webhook info via curl
curl https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

Response example:
```json
{
  "ok": true,
  "result": {
    "url": "https://bot.example.com/blog/webhook/",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "last_error_date": 0,
    "last_error_message": ""
  }
}
```

### Updating Webhook

To update the webhook:

1. Update `WEBHOOK_URL` in `.env`
2. Restart the bot container:
   ```bash
   docker compose restart bot
   ```
3. The webhook will update automatically

### Removing Webhook

To switch to long polling mode:

1. Remove or empty `WEBHOOK_URL` in `.env`
2. Restart the bot container:
   ```bash
   docker compose restart bot
   ```
3. The bot will automatically delete the webhook

### Manual Webhook Management

```bash
# Set webhook manually
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://bot.example.com/blog/webhook/"

# Delete webhook
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook"

# Get webhook info
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

### Webhook Security

The webhook endpoint:
- Uses HTTPS (required by Telegram)
- Validates requests from Telegram
- Rate-limited via Nginx
- Protected by security headers

---

## 13. Health Monitoring

### Health Endpoint

The bot exposes a health check endpoint at `/health`.

#### Checking Health

```bash
# Check health via curl
curl http://localhost:8000/health

# Check health with pretty output
curl http://localhost:8000/health | jq

# Check health via HTTPS (if using Nginx)
curl https://bot.example.com/health
```

#### Health Response

```json
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

#### Health Status Values

- `healthy` - All services operational
- `degraded` - Some services degraded but functional
- `unhealthy` - Critical services failing

### Docker Health

Check container health:

```bash
# View container health status
docker compose ps

# View detailed health check
docker inspect sales-bot | grep -A 10 Health
```

### Telegram Status

Check Telegram API status:

```bash
# Verify bot token
curl https://api.telegram.org/bot<BOT_TOKEN>/getMe

# Check webhook status
curl https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

### Database Status

Check PostgreSQL status:

```bash
# Check if PostgreSQL is ready
docker exec salesbot-postgres pg_isready -U postgres

# Check PostgreSQL connection
docker exec salesbot-postgres psql -U postgres -c "SELECT 1"

# Check database size
docker exec salesbot-postgres psql -U postgres -d salesbot -c "SELECT pg_size_pretty(pg_database_size('salesbot'));"
```

### Redis Status

Check Redis status:

```bash
# Check if Redis is responding
docker exec salesbot-redis redis-cli ping

# Check Redis info
docker exec salesbot-redis redis-cli info

# Check Redis memory
docker exec salesbot-redis redis-cli info memory
```

### Monitoring Script

Create a simple monitoring script:

```bash
#!/bin/bash
# monitor.sh

echo "=== Bot Health ==="
curl -s http://localhost:8000/health | jq

echo -e "\n=== Docker Status ==="
docker compose ps

echo -e "\n=== PostgreSQL Status ==="
docker exec salesbot-postgres pg_isready -U postgres

echo -e "\n=== Redis Status ==="
docker exec salesbot-redis redis-cli ping
```

---

## 14. Logging

### Log Locations

Logs are stored in multiple locations:

| Log Type | Location | Description |
|----------|----------|-------------|
| **Application Logs** | Docker container logs | Bot application output |
| **Backup Logs** | `logs/backup.log` | Backup operation logs |
| **Nginx Access Logs** | `/var/log/nginx/access.log` | HTTP requests |
| **Nginx Error Logs** | `/var/log/nginx/error.log` | Nginx errors |
| **System Logs** | `/var/log/syslog` | System events |

### Viewing Logs

#### Docker Container Logs

```bash
# View all container logs
docker compose logs -f

# View specific service logs
docker compose logs -f bot
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f nginx

# View last 100 lines
docker compose logs --tail=100

# View logs since specific time
docker compose logs --since 1h

# View logs with timestamps
docker compose logs -t
```

#### Application Logs

```bash
# View bot logs
docker compose logs -f bot

# Filter for errors
docker compose logs bot | grep -i error

# Filter for warnings
docker compose logs bot | grep -i warn
```

#### Backup Logs

```bash
# View backup logs
tail -f logs/backup.log

# View last backup log
tail -100 logs/backup.log
```

#### Nginx Logs

```bash
# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# View last 100 Nginx errors
sudo tail -100 /var/log/nginx/error.log
```

### Log Rotation

Docker logs are managed by Docker's logging driver. To configure log rotation:

Add to `docker-compose.yml`:
```yaml
services:
  bot:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Debugging Errors

When debugging errors:

1. **Check container logs**
   ```bash
   docker compose logs -f bot
   ```

2. **Check environment variables**
   ```bash
   docker compose exec bot env
   ```

3. **Check database connection**
   ```bash
   docker compose exec bot npx prisma db execute --stdin <<EOF
   SELECT 1;
   EOF
   ```

4. **Check Telegram API**
   ```bash
   curl https://api.telegram.org/bot<BOT_TOKEN>/getMe
   ```

5. **Check health endpoint**
   ```bash
   curl http://localhost:8000/health
   ```

### Log Levels

Configure log level via `LOG_LEVEL` in `.env`:

- `debug` - Detailed debugging information
- `info` - General informational messages
- `warn` - Warning messages
- `error` - Error messages only

---

## 15. Backup

### backup.sh Script

The `backup.sh` script creates PostgreSQL database backups.

#### Running Manual Backup

```bash
# Create a backup
./backup.sh

# Create a backup without retention policy
./backup.sh manual
```

#### What backup.sh Does

1. **Check PostgreSQL container** - Verifies container is running
2. **Create backup directory** - Ensures `backups/` exists
3. **Create backup** - Dumps database and compresses with gzip
4. **Create metadata** - Creates JSON metadata file
5. **Clean old backups** - Removes backups older than retention period (7 days)

#### Backup Format

Backups are named: `salesbot_backup_YYYYMMDD_HHMMSS.sql.gz`

Example: `salesbot_backup_20240101_120000.sql.gz`

#### Backup Location

Backups are stored in: `backups/`

#### Backup Contents

Each backup includes:
- Complete database dump
- All tables and data
- Sequences and indexes
- Metadata file with timestamp

### Automatic Backups

The `one-click.sh` script sets up automatic daily backups.

#### Cron Job

```bash
# View backup cron job
crontab -l
```

Default cron job:
```cron
0 2 * * * cd /path/to/SalesBot && ./backup.sh >> /path/to/SalesBot/logs/backup.log 2>&1
```

This runs backups daily at 2 AM.

#### Manual Cron Setup

If you need to manually add the cron job:

```bash
# Edit crontab
crontab -e

# Add this line
0 2 * * * cd /path/to/SalesBot && ./backup.sh >> /path/to/SalesBot/logs/backup.log 2>&1
```

#### Custom Backup Schedule

To change the backup schedule:

```bash
# Edit crontab
crontab -e

# Examples:
# Every 6 hours
0 */6 * * * cd /path/to/SalesBot && ./backup.sh >> logs/backup.log 2>&1

# Every Sunday at 3 AM
0 3 * * 0 cd /path/to/SalesBot && ./backup.sh >> logs/backup.log 2>&1

# Every 1st of month at midnight
0 0 1 * * cd /path/to/SalesBot && ./backup.sh >> logs/backup.log 2>&1
```

### Backup Retention

By default, backups are retained for 7 days.

#### Changing Retention Period

```bash
# Edit backup.sh
nano backup.sh

# Change RETENTION_DAYS value
RETENTION_DAYS=14  # Keep for 14 days
```

#### Manual Cleanup

```bash
# Remove backups older than 7 days
find backups/ -name "salesbot_backup_*.sql.gz" -mtime +7 -delete

# Remove backups older than 30 days
find backups/ -name "salesbot_backup_*.sql.gz" -mtime +30 -delete
```

### Listing Backups

```bash
# List all backups
ls -lh backups/

# List backups with details
ls -lh backups/*.sql.gz

# Count backups
ls backups/*.sql.gz | wc -l
```

### Backup Verification

To verify a backup:

```bash
# Test backup integrity
gunzip -t backups/salesbot_backup_20240101_120000.sql.gz

# View backup contents
gunzip -c backups/salesbot_backup_20240101_120000.sql.gz | head
```

### Offsite Backup

For production, consider offsite backup:

```bash
# Copy to remote server
scp backups/salesbot_backup_20240101_120000.sql.gz user@remote-server:/backups/

# Sync to S3
aws s3 sync backups/ s3://your-bucket/backups/

# Sync to Google Drive
rclone sync backups/ gdrive:salesbot-backups
```

---

## 16. Restore

### restore.sh Script

The `restore.sh` script restores the database from a backup.

#### Running Restore

```bash
# List available backups
ls -lh backups/

# Restore from specific backup
./restore.sh salesbot_backup_20240101_120000.sql.gz
```

#### What restore.sh Does

1. **Verify backup exists** - Checks if backup file exists
2. **Confirm restore** - Prompts for confirmation
3. **Check PostgreSQL** - Verifies container is running
4. **Stop bot container** - Stops bot to prevent conflicts
5. **Drop database** - Drops existing database
6. **Create database** - Creates fresh database
7. **Restore data** - Restores from backup file
8. **Start bot container** - Restarts bot
9. **Verify restore** - Verifies database has data

#### Restore Confirmation

The script requires confirmation before proceeding:
```
This will REPLACE the current database with the backup
This action cannot be undone!

Are you sure you want to continue? (type 'yes' to confirm):
```

#### Manual Restore

If you need to manually restore:

```bash
# Stop bot container
docker compose stop bot

# Drop database
docker exec salesbot-postgres psql -U postgres -c "DROP DATABASE IF EXISTS salesbot;"

# Create database
docker exec salesbot-postgres psql -U postgres -c "CREATE DATABASE salesbot;"

# Restore from backup
gunzip -c backups/salesbot_backup_20240101_120000.sql.gz | docker exec -i salesbot-postgres psql -U postgres -d salesbot

# Start bot container
docker compose start bot
```

### Point-in-Time Recovery

For point-in-time recovery, you need:
1. A base backup
2. WAL archive (PostgreSQL write-ahead logs)

This requires additional PostgreSQL configuration not covered in this guide.

### Restore Verification

After restore, verify:

```bash
# Check database has tables
docker exec salesbot-postgres psql -U postgres -d salesbot -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"

# Check specific table
docker exec salesbot-postgres psql -U postgres -d salesbot -c "SELECT COUNT(*) FROM \"TelUser\";"

# Check bot health
curl http://localhost:8000/health
```

### Partial Restore

To restore specific tables:

```bash
# Extract specific table from backup
gunzip -c backups/salesbot_backup_20240101_120000.sql.gz | grep -A 1000 "COPY \"TelUser\"" > teluser_data.sql

# Restore specific table
docker exec -i salesbot-postgres psql -U postgres -d salesbot < teluser_data.sql
```

---

## 17. Troubleshooting

### Common Issues

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| **Bot not starting** | Container crash, missing env vars | Check logs: `docker compose logs bot`<br>Validate env: `./validate-env.sh` |
| **Database connection failed** | PostgreSQL not ready, wrong password | Check PostgreSQL: `docker compose ps postgres`<br>Verify password in `.env` |
| **Docker failed to start** | Docker not installed, permission issues | Install Docker: `curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh`<br>Add user to docker group: `sudo usermod -aG docker $USER` |
| **SSL certificate failed** | Domain not pointing, port blocked | Check DNS: `dig bot.example.com`<br>Check ports: `sudo ufw status`<br>Request certificate manually |
| **Webhook failed** | WEBHOOK_URL not set, SSL not configured | Set WEBHOOK_URL in `.env`<br>Ensure SSL is configured |
| **Nginx failed** | Configuration error, port conflict | Test config: `sudo nginx -t`<br>Check logs: `sudo tail -f /var/log/nginx/error.log` |
| **Telegram API error** | Invalid bot token, API rate limit | Verify token: `curl https://api.telegram.org/bot<TOKEN>/getMe`<br>Wait if rate limited |
| **Prisma migration error** | Schema mismatch, database locked | Reset database (dev only): `docker compose exec -T bot npx prisma migrate reset`<br>Check migration files |
| **Container restart loop** | Health check failing, resource limits | Check logs: `docker compose logs -f bot`<br>Check resources: `docker stats` |
| **Out of disk space** | Too many backups, Docker images | Clean Docker: `docker system prune -a`<br>Remove old backups: `find backups/ -mtime +7 -delete` |
| **Port already in use** | Another service using port 8000 | Check port: `sudo lsof -i :8000`<br>Stop conflicting service |
| **Permission denied** | File permissions, Docker socket | Fix permissions: `sudo chown -R $USER:$USER uploads/`<br>Fix Docker socket: `sudo chmod 666 /var/run/docker.sock` |

### Detailed Troubleshooting

#### Bot Not Starting

**Symptoms**: Container exits immediately or restarts continuously

**Diagnosis**:
```bash
# Check container status
docker compose ps

# Check container logs
docker compose logs bot

# Check environment variables
docker compose exec bot env
```

**Solutions**:
1. Validate environment variables
   ```bash
   ./validate-env.sh
   ```

2. Check for missing dependencies
   ```bash
   docker compose build --no-cache
   ```

3. Check database connection
   ```bash
   docker exec salesbot-postgres pg_isready -U postgres
   ```

#### Database Connection Failed

**Symptoms**: Bot can't connect to PostgreSQL

**Diagnosis**:
```bash
# Check PostgreSQL container
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres

# Test connection
docker exec salesbot-postgres psql -U postgres -c "SELECT 1"
```

**Solutions**:
1. Verify DATABASE_URL in `.env`
2. Ensure POSTGRES_PASSWORD matches
3. Restart PostgreSQL container
   ```bash
   docker compose restart postgres
   ```

#### Docker Failed

**Symptoms**: Docker commands not working

**Diagnosis**:
```bash
# Check Docker status
sudo systemctl status docker

# Check Docker version
docker --version

# Test Docker
docker run hello-world
```

**Solutions**:
1. Reinstall Docker
   ```bash
   sudo apt remove docker docker-engine docker.io containerd runc
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   ```

2. Add user to docker group
   ```bash
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

#### SSL Certificate Failed

**Symptoms**: Can't obtain SSL certificate

**Diagnosis**:
```bash
# Check DNS
dig bot.example.com

# Check port 80
sudo ufw status

# Check Nginx
sudo nginx -t
```

**Solutions**:
1. Ensure domain points to server IP
2. Ensure port 80 is open
3. Request certificate manually
   ```bash
   sudo certbot certonly --webroot --webroot-path=/var/www/certbot -d bot.example.com
   ```

#### Webhook Failed

**Symptoms**: Telegram not receiving updates

**Diagnosis**:
```bash
# Check webhook info
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Check health endpoint
curl http://localhost:8000/health
```

**Solutions**:
1. Set WEBHOOK_URL in `.env`
2. Restart bot container
   ```bash
   docker compose restart bot
   ```
3. Verify SSL is working
   ```bash
   curl https://bot.example.com/health
   ```

#### Nginx Failed

**Symptoms**: Nginx not serving requests

**Diagnosis**:
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

**Solutions**:
1. Fix configuration errors
2. Restart Nginx
   ```bash
   sudo systemctl restart nginx
   ```
3. Check port conflicts
   ```bash
   sudo lsof -i :80
   sudo lsof -i :443
   ```

### Getting Help

If you can't resolve the issue:

1. Check logs: `docker compose logs -f`
2. Validate environment: `./validate-env.sh`
3. Check health: `curl http://localhost:8000/health`
4. Review this documentation
5. Check GitHub issues

---

## 18. Maintenance

### Updating Ubuntu

Keep the server updated with security patches:

```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Full distribution upgrade (caution)
sudo apt dist-upgrade -y

# Remove unused packages
sudo apt autoremove -y

# Clean package cache
sudo apt clean
```

### Updating Docker

Keep Docker updated:

```bash
# Check Docker version
docker --version

# Update Docker
sudo apt update
sudo apt upgrade docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Restart Docker
sudo systemctl restart docker
```

### Updating Dependencies

Update Node.js dependencies:

```bash
# Rebuild containers (pulls latest dependencies)
docker compose build --no-cache

# Restart containers
docker compose up -d
```

### Updating Prisma

When database schema changes:

```bash
# Generate new migration
docker compose exec -T bot npx prisma migrate dev --name migration_name

# Deploy migration to production
docker compose exec -T bot npx prisma migrate deploy

# Regenerate Prisma Client
docker compose exec -T bot npx prisma generate
```

### Updating Telegram Bot

When bot code changes:

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

Or use the update script:
```bash
./update.sh
```

### Maintenance Schedule

Recommended maintenance tasks:

| Frequency | Task |
|----------|------|
| **Daily** | Check logs, verify health |
| **Weekly** | Check disk space, review backups |
| **Monthly** | Update system, update dependencies |
| **Quarterly** | Review security, audit access |

### Disk Space Management

Monitor and manage disk space:

```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Clean Docker
docker system prune -a

# Remove old backups
find backups/ -name "salesbot_backup_*.sql.gz" -mtime +7 -delete

# Clean logs
sudo journalctl --vacuum-time=7d
```

### Performance Monitoring

Monitor system performance:

```bash
# Check CPU usage
top

# Check memory usage
free -h

# Check disk I/O
iostat

# Check network
iftop
```

### Security Audits

Regularly audit security:

```bash
# Check failed login attempts
sudo lastb

# Check active connections
sudo netstat -tulpn

# Check open ports
sudo ss -tulpn

# Review firewall rules
sudo ufw status verbose
```

---

## 19. Security

### Firewall

UFW (Uncomplicated Firewall) is configured by the installation script:

```bash
# Check firewall status
sudo ufw status

# View detailed rules
sudo ufw status verbose

# Allow additional port
sudo ufw allow 8080/tcp

# Deny specific IP
sudo ufw deny from 192.168.1.100

# Reset firewall (caution)
sudo ufw reset
```

Default rules:
- Allow SSH (port 22)
- Allow HTTP (port 80)
- Allow HTTPS (port 443)
- Deny all other incoming traffic

### HTTPS

HTTPS is enforced via:
- Let's Encrypt SSL certificates
- HSTS header
- TLS 1.2 and 1.3 only
- Strong cipher suites

### Environment Variables

Protect environment variables:

```bash
# Set restrictive permissions
chmod 600 .env

# Ensure .env is in .gitignore
echo ".env" >> .gitignore

# Never commit .env to git
git rm --cached .env
```

### Backups

Secure your backups:

```bash
# Encrypt backup
gpg --encrypt --recipient your@email.com backups/salesbot_backup_20240101_120000.sql.gz

# Store backup offsite
scp backups/salesbot_backup_20240101_120000.sql.gz user@remote-server:/secure/backups/
```

### Docker Security

Docker security best practices:

```bash
# Run containers as non-root (already configured)
# Use Docker secrets for sensitive data
# Limit container resources
# Scan images for vulnerabilities
docker scan sales-bot:latest
```

### PostgreSQL Security

PostgreSQL security:

- Strong password (set via POSTGRES_PASSWORD)
- Database not exposed to public (only accessible via Docker network)
- Regular backups
- Limit database user permissions

### Additional Security Measures

Consider implementing:

1. **Fail2Ban** - Block brute force attacks
2. **SSH Key Authentication** - Disable password authentication
3. **Regular Security Updates** - Keep system updated
4. **Monitoring** - Set up intrusion detection
5. **Access Logs** - Regularly review access logs

---

## 20. Production Checklist

Before going live, verify:

### Pre-Deployment

- [ ] Server meets system requirements
- [ ] Domain DNS is configured correctly
- [ ] SSL certificate is obtained
- [ ] Firewall is configured
- [ ] Environment variables are set
- [ ] Environment is validated
- [ ] Backups are configured
- [ ] Monitoring is set up

### Application

- [ ] Bot token is valid
- [ ] Bot commands are configured
- [ ] Admin password is secure
- [ ] PostgreSQL password is secure
- [ ] Upload chat ID is set
- [ ] Webhook URL is set (if using webhook mode)
- [ ] Storage is configured (local or S3)

### Database

- [ ] Migrations are applied
- [ ] Database is seeded (if needed)
- [ ] Backup is created
- [ ] Restore is tested

### Services

- [ ] All containers are running
- [ ] Health checks are passing
- [ ] Nginx is configured
- [ ] SSL is working
- [ ] Webhook is registered

### Testing

- [ ] Bot responds to /start
- [ ] Bot responds to commands
- [ ] Web interface is accessible
- [ ] Health endpoint is accessible
- [ ] Backup script works
- [ ] Restore script works

### Security

- [ ] Default passwords are changed
- [ ] HTTPS is enforced
- [ ] Firewall is enabled
- [ ] SSH keys are used
- [ ] .env file is not committed

### Documentation

- [ ] Deployment documentation is reviewed
- [ ] Team is trained on procedures
- [ ] Emergency contacts are known
- [ ] Runbook is created

---

## 21. Quick Commands

### Container Management

```bash
# Start all containers
docker compose up -d

# Stop all containers
docker compose down

# Restart all containers
docker compose restart

# View container status
docker compose ps

# View logs
docker compose logs -f
```

### Database Operations

```bash
# Run migrations
docker compose exec -T bot npx prisma migrate deploy

# Seed database
docker compose exec -T bot npx prisma db seed

# Access PostgreSQL
docker compose exec postgres psql -U postgres -d salesbot

# Open Prisma Studio
docker compose exec -T bot npx prisma studio
```

### Backup and Restore

```bash
# Create backup
./backup.sh

# Create manual backup
./backup.sh manual

# List backups
ls -lh backups/

# Restore backup
./restore.sh salesbot_backup_20240101_120000.sql.gz
```

### Updates

```bash
# Update application
./update.sh

# Pull latest code
git pull

# Rebuild containers
docker compose build
```

### Health Checks

```bash
# Check health endpoint
curl http://localhost:8000/health

# Check PostgreSQL
docker exec salesbot-postgres pg_isready -U postgres

# Check Redis
docker exec salesbot-redis redis-cli ping

# Verify bot token
curl https://api.telegram.org/bot<TOKEN>/getMe
```

### Nginx

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo nginx -s reload

# Restart Nginx
sudo systemctl restart nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Environment

```bash
# Validate environment
./validate-env.sh

# Edit environment
nano .env

# Restart after env change
docker compose restart bot
```

### SSL

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Renew with dry run
sudo certbot renew --dry-run
```

### System

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Check disk space
df -h

# Check memory
free -h

# Check Docker resources
docker system df

# Clean Docker
docker system prune -a
```

---

## 22. Disaster Recovery

### Server Crash

If the server crashes:

1. **Replace hardware or provision new server**
2. **Install Docker and dependencies**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```
3. **Clone repository**
   ```bash
   git clone <repository>
   cd SalesBot
   ```
4. **Restore .env file**
   - Copy from backup or recreate
5. **Restore backups**
   ```bash
   # Copy backups from offsite
   scp user@backup-server:/backups/* backups/
   
   # Restore latest backup
   ./restore.sh salesbot_backup_YYYYMMDD_HHMMSS.sql.gz
   ```
6. **Start services**
   ```bash
   ./one-click.sh
   ```
7. **Verify services**
   ```bash
   curl http://localhost:8000/health
   ```

### Power Outage

After power outage:

1. **Check server status**
   ```bash
   # Check if server is running
   ping your-server-ip
   
   # SSH into server
   ssh user@server
   ```

2. **Check Docker status**
   ```bash
   sudo systemctl status docker
   
   # Start Docker if not running
   sudo systemctl start docker
   ```

3. **Check containers**
   ```bash
   docker compose ps
   
   # Start containers if not running
   docker compose up -d
   ```

4. **Verify services**
   ```bash
   curl http://localhost:8000/health
   ```

Containers should restart automatically due to `restart: unless-stopped` policy.

### Database Corruption

If database is corrupted:

1. **Stop bot container**
   ```bash
   docker compose stop bot
   ```

2. **Restore from backup**
   ```bash
   ./restore.sh salesbot_backup_YYYYMMDD_HHMMSS.sql.gz
   ```

3. **Verify restore**
   ```bash
   docker exec salesbot-postgres psql -U postgres -d salesbot -c "SELECT COUNT(*) FROM \"TelUser\";"
   ```

### Lost SSL Certificate

If SSL certificate is lost:

1. **Request new certificate**
   ```bash
   sudo certbot certonly --webroot \
       --webroot-path=/var/www/certbot \
       --email your@email.com \
       --agree-tos \
       --no-eff-email \
       -d bot.example.com
   ```

2. **Copy certificates**
   ```bash
   sudo cp /etc/letsencrypt/live/bot.example.com/fullchain.pem ssl/
   sudo cp /etc/letsencrypt/live/bot.example.com/privkey.pem ssl/
   sudo cp /etc/letsencrypt/live/bot.example.com/chain.pem ssl/
   sudo chown -R $USER:$USER ssl/
   ```

3. **Restart Nginx**
   ```bash
   sudo systemctl restart nginx
   ```

### Telegram Webhook Removal

If webhook is accidentally removed:

1. **Set WEBHOOK_URL in .env**
2. **Restart bot container**
   ```bash
   docker compose restart bot
   ```
3. **Verify webhook**
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```

### Complete Disaster Recovery Plan

For complete disaster recovery:

1. **Regular Offsite Backups**
   - Daily database backups
   - Weekly configuration backups
   - Store in multiple locations

2. **Documentation**
   - Keep this documentation updated
   - Document any custom changes
   - Store documentation offsite

3. **Testing**
   - Test restore procedures monthly
   - Test backup integrity
   - Document any issues

4. **Monitoring**
   - Set up alerts for failures
   - Monitor disk space
   - Monitor service health

5. **Communication**
   - Have emergency contacts
   - Know escalation procedures
   - Document recovery time objectives

---

## 23. Conclusion

### How the System Works in Production

The SalesBot production deployment is designed for:
- **Reliability**: Automatic restarts, health checks, backups
- **Security**: SSL, firewall, secure passwords
- **Scalability**: Docker containers, can be scaled horizontally
- **Maintainability**: Automated scripts, comprehensive logging
- **Recoverability**: Backups, restore procedures, disaster recovery

### Deployment Workflow Summary

1. **Initial Setup**
   - Provision Ubuntu Server
   - Configure DNS
   - Run `one-click.sh`
   - Configure environment variables

2. **Operation**
   - Monitor health checks
   - Review logs regularly
   - Verify backups
   - Apply updates

3. **Maintenance**
   - Update system monthly
   - Update dependencies regularly
   - Review security quarterly
   - Test disaster recovery

4. **Troubleshooting**
   - Check logs first
   - Validate environment
   - Check health endpoints
   - Use troubleshooting table

### Key Takeaways

- **Zero-Config Deployment**: One command sets up everything
- **Automated**: Backups, SSL, updates are automated
- **Secure**: HTTPS, firewall, secure defaults
- **Monitored**: Health checks, logs, metrics
- **Recoverable**: Backups, restore procedures
- **Maintainable**: Clear documentation, scripts

### Support and Resources

- **Documentation**: This DEPLOYMENT.md file
- **README.md**: Project overview and quick start
- **GitHub Issues**: Report bugs and feature requests
- **Logs**: `docker compose logs -f`
- **Health Check**: `curl http://localhost:8000/health`

### Final Notes

This deployment system is designed to be:
- **Production-Ready**: Suitable for 24/7 operation
- **User-Friendly**: Minimal DevOps knowledge required
- **Idempotent**: Scripts can be run multiple times safely
- **Comprehensive**: Covers all aspects of deployment and maintenance

With this system, you can deploy and maintain SalesBot with minimal manual intervention, ensuring reliable and secure operation in production.

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-01  
**SalesBot Version**: 2.0.0
