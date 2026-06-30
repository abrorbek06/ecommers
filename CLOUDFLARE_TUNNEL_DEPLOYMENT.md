# Cloudflare Tunnel Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying your SalesBot application on Ubuntu Server 24.04 using Cloudflare Tunnel. This setup requires **no domain** and **no port forwarding**, making it perfect for home server deployments.

## Prerequisites

- Fresh Ubuntu Server 24.04 LTS installation
- SSH access to the server
- Non-root user with sudo privileges
- Stable internet connection
- Telegram bot token from @BotFather

## Key Features

- **No domain required** - Cloudflare Tunnel provides a public URL automatically
- **No port forwarding** - Only SSH port needs to be open
- **Auto-restart on boot** - Docker containers and Cloudflare Tunnel start automatically
- **Power outage resistant** - All services survive reboots
- **Secure by default** - Firewall only allows SSH, app exposed via tunnel

## Architecture

```
Internet → Cloudflare Tunnel (HTTPS) → localhost:8000 → Docker Container
```

## Step-by-Step Deployment

### Step 1: Server Preparation

1. **Update system packages:**
```bash
sudo apt update && sudo apt upgrade -y
```

2. **Ensure you have a non-root user with sudo privileges:**
```bash
# If logged in as root, create a user
adduser yourusername
usermod -aG sudo yourusername
```

3. **Set up SSH key authentication (recommended):**
```bash
# On your local machine
ssh-copy-id yourusername@your-server-ip
```

### Step 2: Clone Repository

```bash
# Clone the repository
cd ~
git clone <your-repository-url> ecommers
cd ecommers
```

### Step 3: Run One-Click Deployment

The `one-click.sh` script automates the entire deployment process:

```bash
chmod +x one-click.sh
./one-click.sh
```

**The script will:**
- Install Docker and Docker Compose
- Install Cloudflare Tunnel (cloudflared)
- Configure UFW firewall (SSH only)
- Set up environment variables
- Build and start Docker containers
- Create and configure Cloudflare Tunnel
- Set up systemd service for auto-start
- Run database migrations
- Configure Telegram webhook

### Step 4: Interactive Configuration

During deployment, you'll be prompted for:

1. **Use Cloudflare Tunnel?** - Press Enter (default: Yes)
2. **Environment** - Press Enter for production
3. **Bot Token** - Enter your Telegram bot token from @BotFather
4. **PostgreSQL Password** - Enter a secure password (min 16 chars)
5. **Admin Password** - Enter a secure password (min 12 chars)
6. **Upload Chat ID** - Enter your Telegram chat ID (get from @userinfobot)

### Step 5: Verify Deployment

After the script completes, verify:

```bash
# Check Docker containers
docker compose ps

# Check Cloudflare Tunnel status
sudo systemctl status cloudflared

# Check application logs
docker compose logs -f bot

# Test health endpoint
curl http://localhost:8000/health
```

### Step 6: Get Your Public URL

The deployment script will display your Cloudflare Tunnel URL. You can also find it with:

```bash
cloudflared tunnel info salesbot-tunnel
```

Or check the logs:

```bash
sudo journalctl -u cloudflared -n 50 --no-pager | grep trycloudflare.com
```

Your public URL will look like: `https://random-name.trycloudflare.com`

## Post-Deployment Configuration

### Update Webhook URL (if needed)

If the webhook URL wasn't set automatically, update it manually:

```bash
# Edit .env file
nano .env

# Set WEBHOOK_URL to your Cloudflare Tunnel URL
WEBHOOK_URL="https://your-tunnel-url.trycloudflare.com"

# Restart bot
docker compose restart bot
```

### Test Telegram Bot

1. Send `/start` to your bot on Telegram
2. Verify the bot responds
3. Check webhook is working: `docker compose logs bot`

### Access Admin Panel

Navigate to: `https://your-tunnel-url.trycloudflare.com/admin`

Use the admin password you set during deployment.

## Firewall Configuration

The deployment script configures UFW to only allow SSH:

```bash
# Check firewall status
sudo ufw status

# Should show:
# Status: active
# 22/tcp                     ALLOW       Anywhere
```

**No other ports need to be open** - Cloudflare Tunnel handles all external traffic.

## Auto-Start Configuration

### Docker Containers

All Docker containers have `restart: unless-stopped` policy, ensuring they:
- Start automatically on system boot
- Restart automatically if they crash
- Stay running unless manually stopped

### Cloudflare Tunnel

Cloudflare Tunnel runs as a systemd service:

```bash
# Service file location
/etc/systemd/system/cloudflared.service

# Check service status
sudo systemctl status cloudflared

# Service is enabled to start on boot
sudo systemctl is-enabled cloudflared  # Should output: enabled
```

## Power Outage Recovery

After a power outage or reboot:

1. **Docker containers** start automatically (Docker service is enabled)
2. **Cloudflare Tunnel** starts automatically (systemd service is enabled)
3. **Application** becomes available within 30-60 seconds
4. **No manual intervention required**

## Maintenance Commands

### View Logs

```bash
# Application logs
docker compose logs -f bot

# Cloudflare Tunnel logs
sudo journalctl -u cloudflared -f

# All Docker services
docker compose logs -f
```

### Restart Services

```bash
# Restart application
docker compose restart bot

# Restart Cloudflare Tunnel
sudo systemctl restart cloudflared

# Restart everything
docker compose restart
sudo systemctl restart cloudflared
```

### Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose up -d --build

# Restart bot
docker compose restart bot
```

### Backup Database

```bash
# Manual backup
chmod +x backup.sh
./backup.sh
```

Automatic daily backups are configured by the deployment script.

### Restore Database

```bash
# List available backups
ls -lt backups/

# Restore from backup
chmod +x restore.sh
./restore.sh salesbot_backup_YYYY-MM-DD_HH-MM-SS.sql.gz
```

## Troubleshooting

### Cloudflare Tunnel Not Starting

```bash
# Check service status
sudo systemctl status cloudflared

# View logs
sudo journalctl -u cloudflared -n 100

# Restart service
sudo systemctl restart cloudflared

# Check configuration
cat ~/.cloudflared/config.yml
```

### Application Not Accessible

```bash
# Check if bot container is running
docker compose ps

# Check if port 1 is exposed
docker compose logs bot

# Test local access
curl http://localhost:8000/health

# Check Cloudflare Tunnel is running
sudo systemctl status cloudflared
```

### Webhook Not Working

```bash
# Check webhook URL in .env
grep WEBHOOK_URL .env

# Verify bot logs for webhook errors
docker compose logs bot | grep webhook

# Manually test webhook URL
curl https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo
```

### Database Connection Issues

```bash
# Check PostgreSQL container
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres

# Test database connection
docker exec salesbot-postgres pg_isready -U postgres
```

### Firewall Issues

```bash
# Check UFW status
sudo ufw status

# If SSH is blocked, access via console
sudo ufw allow 22/tcp
sudo ufw reload
```

## Security Considerations

### What's Secured

- **Firewall**: Only SSH port (22) is open
- **Application ports**: Not exposed to internet (only localhost)
- **Environment variables**: .env file has 600 permissions
- **Docker containers**: Run with security hardening (read-only, dropped capabilities)
- **Cloudflare Tunnel**: Provides HTTPS encryption automatically

### Best Practices

1. **Use SSH keys** instead of password authentication
2. **Keep system updated**: `sudo apt update && sudo apt upgrade -y`
3. **Monitor logs regularly**: `docker compose logs -f`
4. **Use strong passwords** for database and admin
5. **Regular backups**: Automated daily backups are configured
6. **Limit SSH access**: Consider using `AllowUsers` in `/etc/ssh/sshd_config`

### What to Avoid

- **Don't open additional ports** - Cloudflare Tunnel handles all external traffic
- **Don't disable firewall** - UFW provides essential protection
- **Don't commit .env file** - Contains sensitive credentials
- **Don't use weak passwords** - Script enforces minimum length requirements

## Cloudflare Tunnel URL Persistence

**Important**: Cloudflare Tunnel URLs (`*.trycloudflare.com`) can change when:
- The tunnel is recreated
- Cloudflare Tunnel service is reinstalled
- System is completely reinstalled

**To preserve your URL**:
1. Save your tunnel credentials: `~/.cloudflared/<TUNNEL_ID>.json`
2. Save your tunnel ID from: `cloudflared tunnel list`
3. Backup these files with your application backup

**If URL changes**:
1. Update `WEBHOOK_URL` in `.env`
2. Update `ALLOWED_ORIGINS` in `.env`
3. Restart bot: `docker compose restart bot`

## Alternative: Custom Domain (Optional)

If you later acquire a domain, you can:

1. Add domain to Cloudflare (free account)
2. Update tunnel configuration to use custom domain
3. Update `~/.cloudflared/config.yml`:
```yaml
ingress:
  - hostname: yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
```

## Performance Considerations

- **Cloudflare Tunnel**: Adds minimal latency (~50-100ms)
- **Docker overhead**: Minimal for this application
- **Database**: PostgreSQL runs in Docker with sufficient resources
- **Redis**: Used for caching, improves performance

## Monitoring

### Health Check

```bash
# Application health
curl http://localhost:8000/health

# Container health
docker compose ps

# Service health
sudo systemctl status cloudflared
```

### Resource Usage

```bash
# Docker resource usage
docker stats

# System resources
htop
```

## Summary

Your deployment is now:
- ✅ Accessible via Cloudflare Tunnel (no domain needed)
- ✅ Survives power outages and reboots
- ✅ Secure (only SSH port open)
- ✅ Auto-starting (Docker + systemd)
- ✅ Automatically backed up daily
- ✅ HTTPS enabled (via Cloudflare)

**Zero manual steps required after setup** - everything is automated!
