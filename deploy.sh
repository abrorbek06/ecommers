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

# Function to build Docker images
build_images() {
    print_info "Building Docker images..."
    docker-compose build
    print_info "Docker images built successfully"
}

# Function to restart containers with minimal downtime
restart_containers() {
    print_info "Restarting containers with minimal downtime..."
    
    # Use docker-compose rolling update strategy
    # Start new containers before stopping old ones
    docker-compose up -d --no-deps --build bot
    
    # Wait for bot to be healthy
    print_info "Waiting for bot to become healthy..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker exec sales-bot node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" >/dev/null 2>&1; then
            print_info "Bot is healthy"
            break
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    # Restart other services if needed
    docker-compose up -d postgres redis
    
    print_info "Containers restarted successfully"
}

# Function to run migrations
run_migrations() {
    print_info "Running Prisma migrations..."
    docker-compose exec -T bot npx prisma migrate deploy
    print_info "Migrations completed successfully"
}

# Function to verify health
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

# Function to clean unused Docker images
clean_images() {
    print_info "Cleaning unused Docker images..."
    docker image prune -f
    print_info "Unused Docker images cleaned successfully"
}

# Function to print success message
print_success() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Deployment completed successfully!  ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Bot Status:"
    echo "  - Containers: Running"
    echo "  - Database: Migrated"
    echo "  - Health Check: Passing"
    echo ""
    echo "Useful Commands:"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Check status: docker-compose ps"
    echo ""
}

# Main deployment process
main() {
    print_info "Starting SalesBot deployment..."
    
    # Check if .env exists
    if [ ! -f .env ]; then
        print_error ".env file not found. Please run install.sh first"
        exit 1
    fi

    # Check if docker-compose.yml exists
    if [ ! -f docker-compose.yml ]; then
        print_error "docker-compose.yml not found"
        exit 1
    fi

    # Build images
    build_images

    # Restart containers
    restart_containers

    # Run migrations
    run_migrations

    # Verify health
    verify_health

    # Clean unused images
    clean_images

    # Print success message
    print_success
}

# Run main function
main
