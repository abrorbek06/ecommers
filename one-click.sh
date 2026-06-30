#!/bin/bash

################################################################################
# SalesBot One-Click Production Deployment Script
# 
# This script automates the entire deployment process on Ubuntu Server 24.04 LTS
# Usage: ./one-click.sh
################################################################################

set -e

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
DOMAIN=""
EMAIL=""
BOT_TOKEN=""
POSTGRES_PASSWORD=""
ADMIN_PASSWORD=""
UPLOAD_CHAT_ID=""
USE_NGINX=true
OBTAIN_SSL=true

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

# Function to install Nginx
install_nginx() {
    print_step "Installing Nginx..."
    
    if command_exists nginx; then
        print_info "Nginx is already installed"
        nginx -v
    else
        print_info "Installing Nginx..."
        sudo apt-get update -y
        sudo apt-get install -y nginx
        print_success "Nginx installed successfully"
    fi

    # Enable Nginx service
    sudo systemctl enable nginx
}

# Function to install Certbot
install_certbot() {
    print_step "Installing Certbot..."
    
    if command_exists certbot; then
        print_info "Certbot is already installed"
        certbot --version
    else
        print_info "Installing Certbot..."
        sudo apt-get update -y
        sudo apt-get install -y certbot python3-certbot-nginx
        print_success "Certbot installed successfully"
    fi
}

# Function to configure UFW firewall
configure_ufw() {
    print_step "Configuring UFW firewall..."
    
    if command_exists ufw; then
        print_info "UFW is already installed"
        
        # Configure UFW rules
        sudo ufw allow 22/tcp
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw --force enable
        
        print_success "UFW configured successfully"
    else
        print_warn "UFW not found. Installing..."
        sudo apt-get update -y
        sudo apt-get install -y ufw
        
        sudo ufw allow 22/tcp
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw --force enable
        
        print_success "UFW installed and configured successfully"
    fi
}

# Function to create required directories
create_directories() {
    print_step "Creating required directories..."
    
    mkdir -p "$SCRIPT_DIR/uploads"
    mkdir -p "$SCRIPT_DIR/ssl"
    mkdir -p "$SCRIPT_DIR/backups"
    mkdir -p "$SCRIPT_DIR/logs"
    
    print_success "Directories created successfully"
}

# Function to setup .env file
setup_env_file() {
    print_step "Setting up environment file..."
    
    if [ -f "$SCRIPT_DIR/.env" ]; then
        print_info ".env file already exists"
        read -p "Do you want to reconfigure it? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
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
    read -p "PostgreSQL Password: " POSTGRES_PASSWORD
    read -p "Admin Password: " ADMIN_PASSWORD
    read -p "Upload Chat ID: " UPLOAD_CHAT_ID
    
    if [ "$USE_NGINX" = true ] && [ "$OBTAIN_SSL" = true ]; then
        read -p "Domain Name (e.g., bot.example.com): " DOMAIN
        read -p "Email for Let's Encrypt: " EMAIL
    fi

    # Update .env file
    sed -i "s/BOT_TOKEN=.*/BOT_TOKEN=\"$BOT_TOKEN\"/" "$SCRIPT_DIR/.env"
    sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=\"$POSTGRES_PASSWORD\"/" "$SCRIPT_DIR/.env"
    sed -i "s/ADMIN_PASSWORD=.*/ADMIN_PASSWORD=\"$ADMIN_PASSWORD\"/" "$SCRIPT_DIR/.env"
    sed -i "s/UPLOAD_CHAT_ID=.*/UPLOAD_CHAT_ID=\"$UPLOAD_CHAT_ID\"/" "$SCRIPT_DIR/.env"
    
    if [ -n "$DOMAIN" ]; then
        sed -i "s|WEBHOOK_URL=.*|WEBHOOK_URL=\"https://$DOMAIN\"|" "$SCRIPT_DIR/.env"
        sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=\"https://$DOMAIN\"|" "$SCRIPT_DIR/.env"
    fi

    print_success "Environment file configured successfully"
}

# Function to validate environment variables
validate_env() {
    print_step "Validating environment variables..."
    
    source "$SCRIPT_DIR/.env"

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
    
    if [ "$USE_NGINX" = true ]; then
        docker compose --profile with-nginx up -d
    else
        docker compose up -d
    fi
    
    print_success "Containers started successfully"
}

# Function to wait for PostgreSQL to be healthy
wait_for_postgres() {
    print_step "Waiting for PostgreSQL to become healthy..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker exec salesbot-postgres pg_isready -U postgres >/dev/null 2>&1; then
            print_success "PostgreSQL is healthy"
            return 0
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
    docker compose exec -T bot npx prisma migrate deploy
    print_success "Migrations completed successfully"
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

# Function to obtain SSL certificate
obtain_ssl() {
    if [ "$USE_NGINX" = false ] || [ "$OBTAIN_SSL" = false ]; then
        print_info "Skipping SSL certificate obtainment"
        return 0
    fi

    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
        print_warn "Domain or email not set, skipping SSL"
        return 0
    fi

    print_step "Obtaining SSL certificate from Let's Encrypt..."
    
    # Create webroot for certbot
    sudo mkdir -p /var/www/certbot
    
    # Obtain certificate
    sudo certbot certonly --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN"
    
    # Copy certificates to project directory
    sudo mkdir -p "$SCRIPT_DIR/ssl"
    sudo cp /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem "$SCRIPT_DIR/ssl/"
    sudo cp /etc/letsencrypt/live/"$DOMAIN"/privkey.pem "$SCRIPT_DIR/ssl/"
    sudo cp /etc/letsencrypt/live/"$DOMAIN"/chain.pem "$SCRIPT_DIR/ssl/"
    sudo chown -R $USER:$USER "$SCRIPT_DIR/ssl"
    
    # Setup auto-renewal
    local renew_hook="$SCRIPT_DIR/scripts/ssl-renew.sh"
    mkdir -p "$SCRIPT_DIR/scripts"
    cat > "$renew_hook" <<EOF
#!/bin/bash
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SCRIPT_DIR/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SCRIPT_DIR/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/chain.pem $SCRIPT_DIR/ssl/
sudo chown -R $USER:$USER $SCRIPT_DIR/ssl
cd $SCRIPT_DIR
docker compose restart nginx
EOF
    chmod +x "$renew_hook"
    
    # Add certbot renew hook
    local renew_line="--deploy-hook '$renew_hook'"
    if ! sudo grep -q "$renew_hook" /etc/cron.d/certbot 2>/dev/null; then
        echo "0 */12 * * * root certbot renew --quiet --deploy-hook '$renew_hook'" | sudo tee -a /etc/cron.d/certbot
    fi
    
    print_success "SSL certificate obtained and configured successfully"
}

# Function to configure Nginx
configure_nginx() {
    if [ "$USE_NGINX" = false ]; then
        print_info "Skipping Nginx configuration"
        return 0
    fi

    print_step "Configuring Nginx..."
    
    # Copy nginx.conf to project if it doesn't exist
    if [ ! -f "$SCRIPT_DIR/nginx.conf" ]; then
        print_error "nginx.conf not found in project directory"
        return 1
    fi
    
    # Update nginx.conf with domain if SSL is obtained
    if [ -f "$SCRIPT_DIR/ssl/fullchain.pem" ] && [ -n "$DOMAIN" ]; then
        print_info "Configuring Nginx with SSL for $DOMAIN"
        # The nginx.conf already has SSL configuration
    fi
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Restart Nginx
    sudo systemctl restart nginx
    
    print_success "Nginx configured successfully"
}

# Function to register/update Telegram webhook
register_webhook() {
    print_step "Registering Telegram webhook..."
    
    source "$SCRIPT_DIR/.env"
    
    if [ -z "$WEBHOOK_URL" ] || [ "$WEBHOOK_URL" = "" ]; then
        print_warn "WEBHOOK_URL not set, bot will run in long polling mode"
        return 0
    fi

    # The webhook is registered automatically by the bot on startup
    print_info "Webhook will be registered automatically by the bot at $WEBHOOK_URL"
}

# Function to verify health endpoint
verify_health() {
    print_step "Verifying /health endpoint..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f http://localhost:8000/health >/dev/null 2>&1; then
            print_success "Health endpoint is responding"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    print_error "Health endpoint did not respond in time"
    return 1
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
    
    source "$SCRIPT_DIR/.env"
    
    local response=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe")
    
    if echo "$response" | grep -q '"ok":true'; then
        local bot_name=$(echo "$response" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
        print_success "Telegram connection verified (Bot: @$bot_name)"
    else
        print_error "Telegram connection failed"
        print_error "Response: $response"
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
    
    if [ "$USE_NGINX" = true ] && [ "$OBTAIN_SSL" = true ] && [ -n "$DOMAIN" ]; then
        echo -e "  ${GREEN}✓${NC} SSL: Configured"
        echo -e "  ${GREEN}✓${NC} Nginx: Running"
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
    
    if [ -n "$DOMAIN" ]; then
        echo "  Webhook:         https://$DOMAIN/blog/webhook/"
        echo "  Admin Panel:     https://$DOMAIN/admin"
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
    
    read -p "Use Nginx reverse proxy? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        USE_NGINX=false
    fi
    
    if [ "$USE_NGINX" = true ]; then
        read -p "Obtain SSL certificate with Let's Encrypt? (Y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            OBTAIN_SSL=false
        fi
    fi
    
    read -p "Environment (production/development) [production]: " NODE_ENV
    NODE_ENV=${NODE_ENV:-production}
}

# Main deployment process
main() {
    print_banner
    
    # Check if running as root
    check_root
    
    # Interactive configuration
    interactive_config
    
    print_info "Starting SalesBot one-click deployment..."
    echo ""
    
    # Install dependencies
    install_docker
    install_docker_compose
    install_git
    
    if [ "$USE_NGINX" = true ]; then
        install_nginx
        install_certbot
        configure_ufw
    fi
    
    # Create directories
    create_directories
    
    # Setup environment file
    setup_env_file
    
    # Validate environment
    validate_env
    
    # Build and start containers
    build_images
    start_containers
    
    # Wait for PostgreSQL
    wait_for_postgres
    
    # Run migrations
    run_migrations
    
    # Run seed if needed
    run_seed
    
    # Obtain SSL if needed
    if [ "$USE_NGINX" = true ] && [ "$OBTAIN_SSL" = true ]; then
        obtain_ssl
        configure_nginx
    fi
    
    # Register webhook
    register_webhook
    
    # Verify services
    verify_health
    verify_postgres
    verify_telegram
    
    # Clean unused images
    clean_images
    
    # Setup automatic backups
    setup_backups
    
    # Print summary
    print_summary
}

# Run main function
main
