#!/bin/bash

################################################################################
# SalesBot Restore Script
# 
# This script restores PostgreSQL database from backup
# Usage: ./restore.sh <backup_file>
# 
# Example: ./restore.sh salesbot_backup_20240101_120000.sql.gz
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
BACKUP_DIR="$SCRIPT_DIR/backups"
BACKUP_FILE=""

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
    echo "║                SalesBot Restore Script                     ║"
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

# Function to parse arguments
parse_args() {
    if [ -z "$1" ]; then
        print_error "No backup file specified"
        echo ""
        echo "Usage: $0 <backup_file>"
        echo ""
        echo "Available backups:"
        list_backups
        exit 1
    fi

    BACKUP_FILE="$1"
    
    # Check if backup file exists
    if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_DIR/$BACKUP_FILE"
        echo ""
        echo "Available backups:"
        list_backups
        exit 1
    fi
}

# Function to list available backups
list_backups() {
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/*.sql.gz 2>/dev/null)" ]; then
        print_warn "No backups found in $BACKUP_DIR"
        return
    fi
    
    echo ""
    ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
}

# Function to confirm restore
confirm_restore() {
    print_warn "This will REPLACE the current database with the backup"
    print_warn "This action cannot be undone!"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Restore cancelled"
        exit 0
    fi
}

# Function to check if PostgreSQL container is running
check_postgres_container() {
    print_step "Checking PostgreSQL container status..."
    
    if docker ps | grep -q salesbot-postgres; then
        print_success "PostgreSQL container is running"
    else
        print_error "PostgreSQL container is not running"
        print_info "Start the containers with: docker compose up -d"
        exit 1
    fi
}

# Function to stop bot container
stop_bot_container() {
    print_step "Stopping bot container..."
    
    if docker ps | grep -q sales-bot; then
        docker compose stop bot
        print_success "Bot container stopped"
    else
        print_info "Bot container is not running"
    fi
}

# Function to restore database
restore_database() {
    print_step "Restoring database from backup..."
    
    local backup_path="$BACKUP_DIR/$BACKUP_FILE"
    
    # Drop existing database and recreate
    print_info "Dropping existing database..."
    docker exec salesbot-postgres psql -U postgres -c "DROP DATABASE IF EXISTS salesbot;"
    
    print_info "Creating new database..."
    docker exec salesbot-postgres psql -U postgres -c "CREATE DATABASE salesbot;"
    
    # Restore from backup
    print_info "Restoring data from backup..."
    gunzip -c "$backup_path" | docker exec -i salesbot-postgres psql -U postgres -d salesbot
    
    if [ $? -eq 0 ]; then
        print_success "Database restored successfully"
    else
        print_error "Database restore failed"
        exit 1
    fi
}

# Function to start bot container
start_bot_container() {
    print_step "Starting bot container..."
    docker compose start bot
    print_success "Bot container started"
}

# Function to verify restore
verify_restore() {
    print_step "Verifying database restore..."
    
    # Check if tables exist
    local table_count=$(docker exec salesbot-postgres psql -U postgres -d salesbot -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | xargs)
    
    if [ "$table_count" -gt "0" ]; then
        print_success "Database verification passed ($table_count tables found)"
    else
        print_warn "Database verification warning: no tables found"
    fi
}

# Function to print summary
print_summary() {
    echo ""
    echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║           Restore Completed Successfully!                   ║${NC}"
    echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Restore Details:${NC}"
    echo -e "  ${GREEN}✓${NC} Backup File: $BACKUP_FILE"
    echo -e "  ${GREEN}✓${NC} Database: salesbot"
    echo -e "  ${GREEN}✓${NC} Bot Container: Started"
    echo ""
    echo -e "${BOLD}Useful Commands:${NC}"
    echo "  View logs:       docker compose logs -f"
    echo "  Check status:    docker compose ps"
    echo "  Create backup:   ./backup.sh"
    echo ""
}

# Main restore process
main() {
    print_banner
    
    # Check if running as root
    check_root
    
    # Parse arguments
    parse_args "$1"
    
    print_info "Starting SalesBot restore..."
    echo ""
    
    # Confirm restore
    confirm_restore
    
    # Check PostgreSQL container
    check_postgres_container
    
    # Stop bot container
    stop_bot_container
    
    # Restore database
    restore_database
    
    # Start bot container
    start_bot_container
    
    # Verify restore
    verify_restore
    
    # Print summary
    print_summary
}

# Run main function
main "$@"
