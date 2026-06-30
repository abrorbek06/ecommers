#!/bin/bash

################################################################################
# SalesBot Update Script
# 
# This script automates the update process
# Usage: ./update.sh
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
UPDATE_LOCKFILE="$SCRIPT_DIR/.update_in_progress"
BACKUP_BEFORE_UPDATE=true
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

# Function to check update lock
check_update_lock() {
    if [ -f "$UPDATE_LOCKFILE" ]; then
        local lock_age=$(($(date +%s) - $(stat -c %Y "$UPDATE_LOCKFILE" 2>/dev/null || echo "0")))
        if [ $lock_age -lt 3600 ]; then
            print_error "Update is already in progress (lock file exists)"
            print_info "If this is an error, remove $UPDATE_LOCKFILE"
            exit 1
        else
            print_warn "Removing stale update lock file"
            rm -f "$UPDATE_LOCKFILE"
        fi
    fi
    touch "$UPDATE_LOCKFILE"
}

# Function to remove update lock
remove_update_lock() {
    rm -f "$UPDATE_LOCKFILE"
}

# Function to create backup before update
create_update_backup() {
    if [ "$BACKUP_BEFORE_UPDATE" = true ]; then
        print_step "Creating backup before update..."
        if [ -f "$SCRIPT_DIR/backup.sh" ]; then
            chmod +x "$SCRIPT_DIR/backup.sh"
            "$SCRIPT_DIR/backup.sh" manual
            print_success "Pre-update backup created"
        else
            print_warn "backup.sh not found, skipping pre-update backup"
        fi
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

    # Pull latest changes with retry
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if git pull origin main || git pull origin master || git pull; then
            print_success "Latest code pulled successfully"
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                print_warn "Git pull failed, retrying ($retry_count/$max_retries)..."
                sleep 5
            fi
        fi
    done
    
    print_error "Git pull failed after $max_retries attempts"
    return 1
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

# Function to verify health
verify_health() {
    print_step "Verifying health endpoint..."
    
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

# Function to rollback on failure
rollback_update() {
    print_error "Update failed, initiating rollback..."
    
    # Find the most recent pre-update backup
    local latest_backup=$(ls -t "$SCRIPT_DIR/backups"/salesbot_backup_*.sql.gz 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        print_error "No pre-update backup found for rollback"
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

# Function to update webhook if needed
update_webhook() {
    print_step "Updating Telegram webhook..."
    
    # Export variables safely
    if [ -f "$SCRIPT_DIR/.env" ]; then
        set -a
        . "$SCRIPT_DIR/.env"
        set +a
    fi
    
    if [ -z "${WEBHOOK_URL:-}" ] || [ "${WEBHOOK_URL:-}" = "" ]; then
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
    
    # Check update lock
    check_update_lock
    
    print_info "Starting SalesBot update..."
    echo ""
    
    # Create backup before update
    create_update_backup
    
    # Pull latest code
    if ! pull_latest_code; then
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback_update
        fi
        remove_update_lock
        exit 1
    fi
    
    # Rebuild containers
    if ! rebuild_containers; then
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback_update
        fi
        remove_update_lock
        exit 1
    fi
    
    # Restart services
    if ! restart_services; then
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback_update
        fi
        remove_update_lock
        exit 1
    fi
    
    # Run migrations
    if ! run_migrations; then
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback_update
        fi
        remove_update_lock
        exit 1
    fi
    
    # Verify health
    if ! verify_health; then
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback_update
        fi
        remove_update_lock
        exit 1
    fi
    
    # Update webhook
    update_webhook
    
    # Remove unused images
    remove_unused_images
    
    # Remove update lock
    remove_update_lock
    
    # Print summary
    print_summary
}

# Trap to ensure lock is removed on exit
trap remove_update_lock EXIT

# Run main function
main
