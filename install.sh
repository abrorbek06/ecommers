#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Docker
install_docker() {
    if command_exists docker; then
        print_info "Docker is already installed"
        return 0
    fi

    print_info "Installing Docker..."
    
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

    print_info "Docker installed successfully"
    print_warn "Please log out and log back in for group changes to take effect"
}

# Function to install Docker Compose
install_docker_compose() {
    if command_exists docker-compose; then
        print_info "Docker Compose is already installed"
        return 0
    fi

    print_info "Installing Docker Compose..."
    
    # Docker Compose is now included in docker-compose-plugin as 'docker compose'
    # If the standalone binary is needed, install it
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose

    print_info "Docker Compose installed successfully"
}

# Function to install Git
install_git() {
    if command_exists git; then
        print_info "Git is already installed"
        return 0
    fi

    print_info "Installing Git..."
    sudo apt-get update -y
    sudo apt-get install -y git

    print_info "Git installed successfully"
}

# Function to create required directories
create_directories() {
    print_info "Creating required directories..."
    
    mkdir -p uploads
    mkdir -p ssl
    
    print_info "Directories created successfully"
}

# Function to setup .env file
setup_env_file() {
    if [ -f .env ]; then
        print_info ".env file already exists"
        return 0
    fi

    print_info "Creating .env file from .env.example..."
    cp .env.example .env
    
    print_warn "Please edit .env file with your configuration before proceeding"
    print_warn "Required variables: BOT_TOKEN, POSTGRES_PASSWORD, ADMIN_PASSWORD, UPLOAD_CHAT_ID"
    
    # Ask if user wants to edit now
    read -p "Do you want to edit .env file now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    fi
}

# Function to build Docker images
build_images() {
    print_info "Building Docker images..."
    docker-compose build
    print_info "Docker images built successfully"
}

# Function to start containers
start_containers() {
    print_info "Starting containers..."
    docker-compose up -d
    print_info "Containers started successfully"
}

# Function to wait for PostgreSQL to be healthy
wait_for_postgres() {
    print_info "Waiting for PostgreSQL to become healthy..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker exec salesbot-postgres pg_isready -U postgres >/dev/null 2>&1; then
            print_info "PostgreSQL is healthy"
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
    print_info "Running Prisma migrations..."
    docker-compose exec -T bot npx prisma migrate deploy
    print_info "Migrations completed successfully"
}

# Function to run database seed
run_seed() {
    print_info "Checking if database seed is needed..."
    
    # Check if any products exist
    local product_count=$(docker-compose exec -T bot npx prisma db execute --stdin <<EOF
SELECT COUNT(*) as count FROM "Product";
EOF
    2>/dev/null || echo "0")

    if [ "$product_count" -gt "0" ]; then
        print_info "Database already seeded, skipping"
        return 0
    fi

    print_info "Running database seed..."
    docker-compose exec -T bot npx prisma db seed
    print_info "Database seed completed successfully"
}

# Function to register Telegram webhook
register_webhook() {
    print_info "Registering Telegram webhook..."
    
    # Check if WEBHOOK_URL is set
    if ! grep -q "WEBHOOK_URL=" .env || grep -q "WEBHOOK_URL=\"\"" .env; then
        print_warn "WEBHOOK_URL not set, skipping webhook registration"
        print_warn "Bot will run in long polling mode"
        return 0
    fi

    # The webhook is registered automatically by the bot on startup
    print_info "Webhook will be registered automatically by the bot"
}

# Function to verify health endpoint
verify_health() {
    print_info "Verifying /health endpoint..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f http://localhost:8000/health >/dev/null 2>&1; then
            print_info "Health endpoint is responding"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    print_error "Health endpoint did not respond in time"
    return 1
}

# Function to print success message
print_success() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Installation completed successfully!  ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Bot Status:"
    echo "  - Containers: Running"
    echo "  - Database: Migrated"
    echo "  - Health Check: Passing"
    echo ""
    echo "Useful Commands:"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Stop containers: docker-compose down"
    echo "  - Restart containers: docker-compose restart"
    echo "  - Check status: docker-compose ps"
    echo ""
}

# Main installation process
main() {
    print_info "Starting SalesBot installation..."
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        print_error "Please do not run this script as root"
        exit 1
    fi

    # Install dependencies
    install_docker
    install_docker_compose
    install_git

    # Create directories
    create_directories

    # Setup environment file
    setup_env_file

    # Build and start containers
    build_images
    start_containers

    # Wait for PostgreSQL
    wait_for_postgres

    # Run migrations
    run_migrations

    # Run seed if needed
    run_seed

    # Register webhook
    register_webhook

    # Verify health
    verify_health

    # Print success message
    print_success
}

# Run main function
main
