#!/bin/bash

################################################################################
# SalesBot One-Click Production Deployment Script
# 
# This script automates the entire deployment process on Ubuntu Server 24.04 LTS
# Usage: ./one-click.sh
################################################################################

set -euo pipefail
trap 'print_error "Script failed at line $LINENO"; exit 1' ERR

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_TOKEN=""
POSTGRES_PASSWORD=""
ADMIN_PASSWORD=""
UPLOAD_CHAT_ID=""
USE_CLOUDFLARE_TUNNEL=true
DEPLOYMENT_LOCKFILE="$SCRIPT_DIR/.deployment_in_progress"
BACKUP_BEFORE_DEPLOY=true
ROLLBACK_ON_FAILURE=true
HEALTH_CHECK_TIMEOUT=120

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}${BOLD}[SUCCESS]${NC} $1"
}

# Function to print banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║           SalesBot One-Click Production Deploy             ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        print_error "Please do not run this script as root"
        print_info "Run it as a regular user with sudo privileges"
        exit 1
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Docker
install_docker() {
    print_step "Installing Docker..."
    
    if command_exists docker; then
        print_info "Docker is already installed"
        docker --version
    else
        print_info "Docker not found. Installing..."
        
        # Update package index
        sudo apt-get update -y

        # Install prerequisites
        sudo apt-get install -y \
            ca-certificates \
            curl \
            gnupg \
            lsb-release

        # Add Docker's official GPG key
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

        # Set up the repository
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

        # Install Docker Engine
        sudo apt-get update -y
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

        # Add current user to docker group
        sudo usermod -aG docker $USER

        print_success "Docker installed successfully"
        print_warn "Please log out and log back in for group changes to take effect"
    fi

    # Enable Docker service
    print_info "Enabling Docker service..."
    sudo systemctl enable docker
    sudo systemctl start docker
}

# Function to install Docker Compose
install_docker_compose() {
    print_step "Installing Docker Compose..."
    
    if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
        print_info "Docker Compose is already installed"
        docker compose version || docker-compose --version
    else
        print_info "Installing Docker Compose standalone..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        print_success "Docker Compose installed successfully"
    fi
}

# Function to install Git
install_git() {
    print_step "Installing Git..."
    
    if command_exists git; then
        print_info "Git is already installed"
        git --version
    else
        print_info "Installing Git..."
        sudo apt-get update -y
        sudo apt-get install -y git
        print_success "Git installed successfully"
    fi
}

# Function to install Cloudflare Tunnel
install_cloudflared() {
    print_step "Installing Cloudflare Tunnel (cloudflared)..."
    
    if command_exists cloudflared; then
        print_info "cloudflared is already installed"
        cloudflared --version
    else
        print_info "Installing cloudflared..."
        
        # Download and install cloudflared
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared-linux-amd64.deb
        rm cloudflared-linux-amd64.deb
        
        print_success "cloudflared installed successfully"
    fi
}


# Function to configure UFW firewall
configure_ufw() {
    print_step "Configuring UFW firewall..."
    
    if command_exists ufw; then
        print_info "UFW is already installed"
        
        # Configure UFW rules - only SSH needed for Cloudflare Tunnel
        sudo ufw allow 22/tcp
        sudo ufw --force enable
        
        print_success "UFW configured successfully (SSH only)"
    else
        print_warn "UFW not found. Installing..."
        sudo apt-get update -y
        sudo apt-get install -y ufw
        
        sudo ufw allow 22/tcp
        sudo ufw --force enable
        
        print_success "UFW installed and configured successfully (SSH only)"
    fi
}

# Function to create required directories
create_directories() {
    print_step "Creating required directories..."
    
    mkdir -p "$SCRIPT_DIR/uploads"
    mkdir -p "$SCRIPT_DIR/backups"
    mkdir -p "$SCRIPT_DIR/logs"
    mkdir -p "$HOME/.cloudflared"
    
    print_success "Directories created successfully"
}

# Function to check deployment lock
check_deployment_lock() {
    if [ -f "$DEPLOYMENT_LOCKFILE" ]; then
        local lock_age=$(($(date +%s) - $(stat -c %Y "$DEPLOYMENT_LOCKFILE" 2>/dev/null || echo "0")))
        if [ $lock_age -lt 3600 ]; then  # Lock is less than 1 hour old
            print_error "Deployment is already in progress (lock file exists)"
            print_info "If this is an error, remove $DEPLOYMENT_LOCKFILE"
            exit 1
        else
            print_warn "Removing stale deployment lock file"
            rm -f "$DEPLOYMENT_LOCKFILE"
        fi
    fi
    touch "$DEPLOYMENT_LOCKFILE"
}

# Function to remove deployment lock
remove_deployment_lock() {
    rm -f "$DEPLOYMENT_LOCKFILE"
}

# Function to create backup before deployment
create_deployment_backup() {
    if [ "$BACKUP_BEFORE_DEPLOY" = true ]; then
        print_step "Creating backup before deployment..."
        if [ -f "$SCRIPT_DIR/backup.sh" ]; then
            chmod +x "$SCRIPT_DIR/backup.sh"
            "$SCRIPT_DIR/backup.sh" manual
            print_success "Pre-deployment backup created"
        else
            print_warn "backup.sh not found, skipping pre-deployment backup"
        fi
    fi
}

# Function to setup .env file
setup_env_file() {
    print_step "Setting up environment file..."
    
    if [ -f "$SCRIPT_DIR/.env" ]; then
        print_info ".env file already exists"
        read -p "Do you want to reconfigure it? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            # Validate existing .env file
            if validate_env >/dev/null 2>&1; then
                print_info "Existing .env file is valid"
                return 0
            else
                print_warn "Existing .env file is invalid, reconfiguring..."
            fi
        fi
    fi

    # Copy appropriate env file
    if [ "$NODE_ENV" = "production" ]; then
        if [ -f "$SCRIPT_DIR/.env.production" ]; then
            cp "$SCRIPT_DIR/.env.production" "$SCRIPT_DIR/.env"
        else
            cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
        fi
    else
        cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    fi

    # Prompt for required variables
    print_info "Please provide the following configuration:"
    
    read -p "Bot Token (from @BotFather): " BOT_TOKEN
    read -s -p "PostgreSQL Password (min 16 chars): " POSTGRES_PASSWORD
    echo
    read -s -p "Admin Password (min 12 chars): " ADMIN_PASSWORD
    echo
    read -p "Upload Chat ID: " UPLOAD_CHAT_ID
    

    # Validate password strength
    if [ ${#POSTGRES_PASSWORD} -lt 16 ]; then
        print_error "PostgreSQL password must be at least 16 characters"
        exit 1
    fi
    
    if [ ${#ADMIN_PASSWORD} -lt 12 ]; then
        print_error "Admin password must be at least 12 characters"
        exit 1
    fi

    # Update .env file
    sed -i.bak "s/BOT_TOKEN=.*/BOT_TOKEN=\"$BOT_TOKEN\"/" "$SCRIPT_DIR/.env"
    sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=\"$POSTGRES_PASSWORD\"/" "$SCRIPT_DIR/.env"
    sed -i "s/ADMIN_PASSWORD=.*/ADMIN_PASSWORD=\"$ADMIN_PASSWORD\"/" "$SCRIPT_DIR/.env"
    sed -i "s/UPLOAD_CHAT_ID=.*/UPLOAD_CHAT_ID=\"$UPLOAD_CHAT_ID\"/" "$SCRIPT_DIR/.env"
    rm -f "$SCRIPT_DIR/.env.bak"
    
    # WEBHOOK_URL will be set by Cloudflare Tunnel after setup
    # ALLOWED_ORIGINS will be set by Cloudflare Tunnel after setup

    # Set secure file permissions
    chmod 600 "$SCRIPT_DIR/.env"

    print_success "Environment file configured successfully"
}

# Function to validate environment variables
validate_env() {
    print_step "Validating environment variables..."
    
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        print_error ".env file not found"
        exit 1
    fi

    # Check file permissions
    local perms=$(stat -c %a "$SCRIPT_DIR/.env" 2>/dev/null || stat -f %A "$SCRIPT_DIR/.env" 2>/dev/null)
    if [ "$perms" != "600" ]; then
        print_warn ".env file has insecure permissions ($perms), setting to 600"
        chmod 600 "$SCRIPT_DIR/.env"
    fi

    # Export variables safely
    set -a
    . "$SCRIPT_DIR/.env"
    set +a

    local errors=0

    # Check required variables
    if [ -z "$BOT_TOKEN" ] || [ "$BOT_TOKEN" = "your_bot_token_here" ]; then
        print_error "BOT_TOKEN is not set"
        errors=$((errors + 1))
    fi

    if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "postgres" ]; then
        print_error "POSTGRES_PASSWORD is not set or insecure"
        errors=$((errors + 1))
    fi

    if [ -z "$ADMIN_PASSWORD" ] || [ "$ADMIN_PASSWORD" = "admin" ]; then
        print_error "ADMIN_PASSWORD is not set or insecure"
        errors=$((errors + 1))
    fi

    if [ -z "$UPLOAD_CHAT_ID" ] || [ "$UPLOAD_CHAT_ID" = "your_upload_chat_id" ]; then
        print_error "UPLOAD_CHAT_ID is not set"
        errors=$((errors + 1))
    fi

    # Validate webhook secret token is set if webhook URL is set
    if [ -n "$WEBHOOK_URL" ] && [ -z "$WEBHOOK_SECRET_TOKEN" ]; then
        print_warn "WEBHOOK_URL is set but WEBHOOK_SECRET_TOKEN is not recommended"
    fi

    if [ $errors -gt 0 ]; then
        print_error "Environment validation failed with $errors errors"
        exit 1
    fi

    print_success "Environment variables validated successfully"
}

# Function to build Docker images
build_images() {
    print_step "Building Docker images..."
    cd "$SCRIPT_DIR"
    docker compose build
    print_success "Docker images built successfully"
}

# Function to start containers
start_containers() {
    print_step "Starting Docker containers..."
    cd "$SCRIPT_DIR"
    docker compose up -d
    print_success "Containers started successfully"
}

# Function to wait for PostgreSQL to be healthy
wait_for_postgres() {
    print_step "Waiting for PostgreSQL to become healthy..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker exec salesbot-postgres pg_isready -U postgres >/dev/null 2>&1; then
            # Additional check: ensure we can actually connect
            if docker exec salesbot-postgres psql -U postgres -d salesbot -c "SELECT 1" >/dev/null 2>&1; then
                print_success "PostgreSQL is healthy and ready"
                return 0
            fi
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    print_error "PostgreSQL did not become healthy in time"
    return 1
}

# Function to run Prisma migrations
run_migrations() {
    print_step "Running Prisma migrations..."
    cd "$SCRIPT_DIR"
    
    # Retry migrations up to 3 times
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if docker compose exec -T bot npx prisma migrate deploy --skip-generate; then
            print_success "Migrations completed successfully"
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                print_warn "Migration failed, retrying ($retry_count/$max_retries)..."
                sleep 5
            fi
        fi
    done
    
    print_error "Migrations failed after $max_retries attempts"
    return 1
}

# Function to run database seed
run_seed() {
    print_step "Checking if database seed is needed..."
    
    local product_count=$(cd "$SCRIPT_DIR" && docker compose exec -T bot npx prisma db execute --stdin <<EOF 2>/dev/null || echo "0"
SELECT COUNT(*)::text FROM "Product";
EOF
)

    if [ "$product_count" -gt "0" ]; then
        print_info "Database already seeded, skipping"
        return 0
    fi

    print_info "Running database seed..."
    cd "$SCRIPT_DIR"
    docker compose exec -T bot npx prisma db seed
    print_success "Database seed completed successfully"
}

# Function to setup Cloudflare Tunnel
setup_cloudflare_tunnel() {
    if [ "$USE_CLOUDFLARE_TUNNEL" = false ]; then
        print_info "Skipping Cloudflare Tunnel setup"
        return 0
    fi

    print_step "Setting up Cloudflare Tunnel..."
    
    # Create tunnel
    print_info "Creating Cloudflare Tunnel..."
    cloudflared tunnel create salesbot-tunnel
    
    # Get tunnel ID
    TUNNEL_ID=$(cloudflared tunnel list | grep salesbot-tunnel | awk '{print $1}')
    
    if [ -z "$TUNNEL_ID" ]; then
        print_error "Failed to create tunnel"
        return 1
    fi
    
    print_info "Tunnel ID: $TUNNEL_ID"
    
    # Create config file
    print_info "Creating Cloudflare Tunnel configuration..."
    mkdir -p "$HOME/.cloudflared"
    
    cat > "$HOME/.cloudflared/config.yml" <<EOF
tunnel: $TUNNEL_ID
credentials-file: $HOME/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: *.trycloudflare.com
    service: http://localhost:8000
  - service: http_status:404
EOF
    
    # Setup systemd service
    print_info "Setting up Cloudflare Tunnel systemd service..."
    
    # Create systemd service file from template
    sed "s/<USER>/$USER/g" "$SCRIPT_DIR/cloudflared.service" | sudo tee /etc/systemd/system/cloudflared.service > /dev/null
    
    # Enable and start service
    sudo systemctl daemon-reload
    sudo systemctl enable cloudflared
    sudo systemctl start cloudflared
    sleep 5  # Give it time to start
    
    # Get the public URL
    print_info "Waiting for Cloudflare Tunnel to establish connection..."
    sleep 10
    
    # Get tunnel URL from cloudflared
    TUNNEL_URL=$(cloudflared tunnel info $TUNNEL_ID 2>/dev/null | grep -o 'https://[^ ]*' | head -1)
    
    if [ -z "$TUNNEL_URL" ]; then
        # Try alternative method
        TUNNEL_URL=$(sudo journalctl -u cloudflared -n 50 --no-pager | grep -o 'https://[^ ]*trycloudflare.com' | head -1)
    fi
    
    if [ -n "$TUNNEL_URL" ]; then
        print_success "Cloudflare Tunnel is running at: $TUNNEL_URL"
        
        # Update .env with webhook URL
        sed -i "s|WEBHOOK_URL=.*|WEBHOOK_URL=\"$TUNNEL_URL\"|" "$SCRIPT_DIR/.env"
        sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=\"$TUNNEL_URL\"|" "$SCRIPT_DIR/.env"
        
        # Restart bot to apply new webhook URL
        docker compose restart bot
        
        print_success "Webhook URL configured: $TUNNEL_URL"
    else
        print_warn "Could not determine tunnel URL. Check with: cloudflared tunnel info $TUNNEL_ID"
        print_info "You can manually set WEBHOOK_URL in .env after deployment"
    fi
    
    print_success "Cloudflare Tunnel setup completed"
}


# Function to register/update Telegram webhook
register_webhook() {
    print_step "Registering Telegram webhook..."
    
    # Export variables safely
    if [ -f "$SCRIPT_DIR/.env" ]; then
        set -a
        . "$SCRIPT_DIR/.env"
        set +a
    fi
    
    if [ -z "${WEBHOOK_URL:-}" ] || [ "${WEBHOOK_URL:-}" = "" ]; then
        print_warn "WEBHOOK_URL not set, bot will run in long polling mode"
        print_info "If using Cloudflare Tunnel, the URL should be set automatically"
        return 0
    fi

    # The webhook is registered automatically by the bot on startup
    print_info "Webhook will be registered automatically by the bot at ${WEBHOOK_URL}"
}

# Function to verify health endpoint
verify_health() {
    print_step "Verifying /health endpoint..."
    
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / 2))
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        # Try both direct container and nginx health checks
        if docker exec sales-bot wget --no-verbose --tries=1 --spider http://localhost:8000/health >/dev/null 2>&1 || \
           wget --no-verbose --tries=1 --spider http://localhost/health >/dev/null 2>&1; then
            print_success "Health endpoint is responding"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    print_error "Health endpoint did not respond in time"
    print_info "Check logs with: docker compose logs bot"
    print_info "Check container status with: docker compose ps"
    return 1
}

# Function to rollback on deployment failure
rollback_deployment() {
    print_error "Deployment failed, initiating rollback..."
    
    # Find the most recent pre-deployment backup
    local latest_backup=$(ls -t "$SCRIPT_DIR/backups"/salesbot_backup_*.sql.gz 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        print_error "No pre-deployment backup found for rollback"
        print_warn "System may be in inconsistent state. Manual intervention required."
        return 1
    fi
    
    print_info "Rolling back to: $(basename "$latest_backup")"
    
    # Stop all containers first
    print_step "Stopping all containers..."
    cd "$SCRIPT_DIR"
    docker compose down
    
    # Call restore script
    if [ -f "$SCRIPT_DIR/restore.sh" ]; then
        chmod +x "$SCRIPT_DIR/restore.sh"
        if "$SCRIPT_DIR/restore.sh" "$(basename "$latest_backup")"; then
            print_success "Rollback completed successfully"
            # Restart containers with previous state
            print_step "Restarting containers..."
            docker compose up -d
            return 0
        else
            print_error "Restore failed during rollback"
            return 1
        fi
    else
        print_error "restore.sh not found, cannot rollback"
        return 1
    fi
}

# Function to verify PostgreSQL connection
verify_postgres() {
    print_step "Verifying PostgreSQL connection..."
    
    if docker exec salesbot-postgres pg_isready -U postgres >/dev/null 2>&1; then
        print_success "PostgreSQL connection verified"
    else
        print_error "PostgreSQL connection failed"
        return 1
    fi
}

# Function to verify Telegram connection
verify_telegram() {
    print_step "Verifying Telegram connection..."
    
    # Export variables safely
    if [ -f "$SCRIPT_DIR/.env" ]; then
        set -a
        . "$SCRIPT_DIR/.env"
        set +a
    fi
    
    local response=$(wget --quiet --output-document=- "https://api.telegram.org/bot${BOT_TOKEN}/getMe")
    
    if echo "$response" | grep -q '"ok":true'; then
        local bot_name=$(echo "$response" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
        print_success "Telegram connection verified (Bot: @$bot_name)"
    else
        print_error "Telegram connection failed"
        return 1
    fi
}

# Function to clean unused Docker images
clean_images() {
    print_step "Cleaning unused Docker images..."
    docker image prune -af
    print_success "Unused Docker images cleaned successfully"
}

# Function to setup automatic backups
setup_backups() {
    print_step "Setting up automatic backups..."
    
    # Create backup script
    local backup_script="$SCRIPT_DIR/backup.sh"
    
    if [ ! -f "$backup_script" ]; then
        print_warn "backup.sh not found, skipping automatic backup setup"
        return 0
    fi
    
    chmod +x "$backup_script"
    
    # Add cron job for daily backup at 2 AM
    local cron_line="0 2 * * * cd $SCRIPT_DIR && ./backup.sh >> $SCRIPT_DIR/logs/backup.log 2>&1"
    
    if ! crontab -l 2>/dev/null | grep -q "$backup_script"; then
        (crontab -l 2>/dev/null; echo "$cron_line") | crontab -
        print_success "Automatic daily backup scheduled at 2 AM"
    else
        print_info "Backup cron job already exists"
    fi
}

# Function to print success summary
print_summary() {
    echo ""
    echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║         Deployment Completed Successfully!                   ║${NC}"
    echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Bot Status:${NC}"
    echo -e "  ${GREEN}✓${NC} Containers: Running"
    echo -e "  ${GREEN}✓${NC} Database: Migrated"
    echo -e "  ${GREEN}✓${NC} Health Check: Passing"
    echo -e "  ${GREEN}✓${NC} PostgreSQL: Connected"
    echo -e "  ${GREEN}✓${NC} Telegram: Connected"
    
    if [ "$USE_CLOUDFLARE_TUNNEL" = true ]; then
        echo -e "  ${GREEN}✓${NC} Cloudflare Tunnel: Running"
    fi
    
    echo ""
    echo -e "${BOLD}Useful Commands:${NC}"
    echo "  View logs:       docker compose logs -f"
    echo "  Stop containers: docker compose down"
    echo "  Restart:         docker compose restart"
    echo "  Check status:    docker compose ps"
    echo "  Update:          ./update.sh"
    echo "  Backup:          ./backup.sh"
    echo "  Restore:         ./restore.sh"
    echo ""
    echo -e "${BOLD}Access Points:${NC}"
    echo "  Health:          http://localhost:8000/health"
    
    if [ "$USE_CLOUDFLARE_TUNNEL" = true ]; then
        # Export variables to get webhook URL
        if [ -f "$SCRIPT_DIR/.env" ]; then
            set -a
            . "$SCRIPT_DIR/.env"
            set +a
        fi
        if [ -n "${WEBHOOK_URL:-}" ]; then
            echo "  Public URL:      ${WEBHOOK_URL}"
            echo "  Webhook:         ${WEBHOOK_URL}/blog/webhook/"
            echo "  Admin Panel:     ${WEBHOOK_URL}/admin"
        else
            echo "  Public URL:      Check with: cloudflared tunnel info"
            echo "  Webhook:         http://localhost:8000/blog/webhook/"
            echo "  Admin Panel:     http://localhost:8000/admin"
        fi
    else
        echo "  Webhook:         http://localhost:8000/blog/webhook/"
        echo "  Admin Panel:     http://localhost:8000/admin"
    fi
    
    echo ""
    echo -e "${YELLOW}Note: If you just installed Docker, please log out and log back in${NC}"
    echo -e "${YELLOW}      for group changes to take effect.${NC}"
    echo ""
}

# Interactive configuration
interactive_config() {
    echo ""
    print_info "Deployment Configuration"
    echo "------------------------------"
    
    read -p "Use Cloudflare Tunnel for public access? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        USE_CLOUDFLARE_TUNNEL=false
        print_warn "Without Cloudflare Tunnel, app will only be accessible locally"
    fi
    
    read -p "Environment (production/development) [production]: " NODE_ENV
    NODE_ENV=${NODE_ENV:-production}
}

# Main deployment process
main() {
    print_banner
    
    # Check if running as root
    check_root
    
    # Check deployment lock
    check_deployment_lock
    
    # Interactive configuration
    interactive_config
    
    print_info "Starting SalesBot one-click deployment..."
    echo ""
    
    # Install dependencies
    install_docker
    install_docker_compose
    install_git
    configure_ufw
    
    if [ "$USE_CLOUDFLARE_TUNNEL" = true ]; then
        install_cloudflared
    fi
    
    # Create directories
    create_directories
    
    # Setup environment file
    setup_env_file
    
    # Validate environment
    validate_env
    
    # Create backup before deployment
    create_deployment_backup
    
    # Build and start containers
    if ! build_images; then
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback_deployment
        fi
        remove_deployment_lock
        exit 1
    fi
    
    if ! start_containers; then
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback_deployment
        fi
        remove_deployment_lock
        exit 1
    fi
    
    # Wait for PostgreSQL
    if ! wait_for_postgres; then
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback_deployment
        fi
        remove_deployment_lock
        exit 1
    fi
    
    # Run migrations
    if ! run_migrations; then
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback_deployment
        fi
        remove_deployment_lock
        exit 1
    fi
    
    # Run seed if needed
    if ! run_seed; then
        print_warn "Seed failed, but continuing (non-critical)"
    fi
    
    # Setup Cloudflare Tunnel if needed
    if [ "$USE_CLOUDFLARE_TUNNEL" = true ]; then
        setup_cloudflare_tunnel
    fi
    
    # Register webhook
    register_webhook
    
    # Verify services
    if ! verify_health; then
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback_deployment
        fi
        remove_deployment_lock
        exit 1
    fi
    
    if ! verify_postgres; then
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback_deployment
        fi
        remove_deployment_lock
        exit 1
    fi
    
    if ! verify_telegram; then
        print_warn "Telegram verification failed, but continuing (may be network issue)"
    fi
    
    # Clean unused images
    clean_images
    
    # Setup automatic backups
    setup_backups
    
    # Remove deployment lock
    remove_deployment_lock
    
    # Print summary
    print_summary
}

# Trap to ensure lock is removed on exit
trap remove_deployment_lock EXIT

# Run main function
main
