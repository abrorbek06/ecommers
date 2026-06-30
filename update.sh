#!/bin/bash

################################################################################
# SalesBot Update Script
# 
# This script automates the update process
# Usage: ./update.sh
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
    echo "║                 SalesBot Update Script                     ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        print_error "Please do not run this script as root"
        exit 1
    fi
}

# Function to pull latest code from Git
pull_latest_code() {
    print_step "Pulling latest code from Git..."
    
    # Check if we're in a git repository
    if [ ! -d .git ]; then
        print_warn "Not in a Git repository, skipping git pull"
        return 0
    fi

    # Stash any local changes
    if ! git diff-index --quiet HEAD --; then
        print_warn "You have uncommitted changes"
        read -p "Do you want to stash them? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git stash
            print_info "Changes stashed"
        else
            print_error "Update aborted"
            exit 1
        fi
    fi

    # Pull latest changes
    git pull origin main || git pull origin master || git pull
    
    print_success "Latest code pulled successfully"
}

# Function to rebuild containers
rebuild_containers() {
    print_step "Rebuilding Docker containers..."
    cd "$SCRIPT_DIR"
    docker compose build
    print_success "Containers rebuilt successfully"
}

# Function to restart services
restart_services() {
    print_step "Restarting services..."
    cd "$SCRIPT_DIR"
    
    # Check if nginx profile is enabled
    if docker compose config | grep -q "with-nginx"; then
        docker compose --profile with-nginx up -d
    else
        docker compose up -d
    fi
    
    print_success "Services restarted successfully"
}

# Function to run migrations
run_migrations() {
    print_step "Running Prisma migrations..."
    cd "$SCRIPT_DIR"
    docker compose exec -T bot npx prisma migrate deploy
    print_success "Migrations completed successfully"
}

# Function to verify health
verify_health() {
    print_step "Verifying health endpoint..."
    
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

# Function to update webhook if needed
update_webhook() {
    print_step "Updating Telegram webhook..."
    
    source "$SCRIPT_DIR/.env" 2>/dev/null || true
    
    if [ -z "$WEBHOOK_URL" ] || [ "$WEBHOOK_URL" = "" ]; then
        print_info "WEBHOOK_URL not set, skipping webhook update"
        return 0
    fi

    # The webhook is registered automatically by the bot on startup
    print_info "Webhook will be updated automatically by the bot"
}

# Function to remove unused Docker images
remove_unused_images() {
    print_step "Removing unused Docker images..."
    docker image prune -af
    print_success "Unused Docker images removed successfully"
}

# Function to print success summary
print_summary() {
    echo ""
    echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║           Update Completed Successfully!                   ║${NC}"
    echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Bot Status:${NC}"
    echo -e "  ${GREEN}✓${NC} Code: Updated to latest version"
    echo -e "  ${GREEN}✓${NC} Containers: Rebuilt and running"
    echo -e "  ${GREEN}✓${NC} Database: Migrated"
    echo -e "  ${GREEN}✓${NC} Health Check: Passing"
    echo -e "  ${GREEN}✓${NC} Webhook: Updated"
    echo -e "  ${GREEN}✓${NC} Docker Images: Cleaned"
    echo ""
    echo -e "${BOLD}Useful Commands:${NC}"
    echo "  View logs:       docker compose logs -f"
    echo "  Check status:    docker compose ps"
    echo "  Restart:         docker compose restart"
    echo ""
}

# Main update process
main() {
    print_banner
    
    # Check if running as root
    check_root
    
    print_info "Starting SalesBot update..."
    echo ""
    
    # Pull latest code
    pull_latest_code
    
    # Rebuild containers
    rebuild_containers
    
    # Restart services
    restart_services
    
    # Run migrations
    run_migrations
    
    # Verify health
    verify_health
    
    # Update webhook
    update_webhook
    
    # Remove unused images
    remove_unused_images
    
    # Print summary
    print_summary
}

# Run main function
main
