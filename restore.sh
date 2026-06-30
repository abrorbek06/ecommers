#!/bin/bash

################################################################################
# SalesBot Restore Script
# 
# This script restores PostgreSQL database from backup
# Usage: ./restore.sh <backup_file>
# 
# Example: ./restore.sh salesbot_backup_20240101_120000.sql.gz
################################################################################

set -euo pipefail
trap 'print_error "Restore failed at line $LINENO"; exit 1' ERR

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

# Function to validate backup before restore
validate_backup() {
    print_step "Validating backup file..."
    
    local backup_path="$BACKUP_DIR/$BACKUP_FILE"
    
    # Check if file exists and is readable
    if [ ! -r "$backup_path" ]; then
        print_error "Backup file is not readable: $backup_path"
        exit 1
    fi
    
    # Validate gzip integrity
    if ! gzip -t "$backup_path" 2>/dev/null; then
        print_error "Backup file is corrupted or not a valid gzip file"
        exit 1
    fi
    
    # Check metadata if exists
    local base_name=$(basename "$backup_path" .sql.gz)
    local metadata_file="$BACKUP_DIR/backup_${base_name#salesbot_backup_}.json"
    
    if [ -f "$metadata_file" ]; then
        print_info "Found backup metadata, validating checksum..."
        local stored_checksum=$(grep -o '"sha256_checksum"[[:space:]]*:[[:space:]]*"[^"]*"' "$metadata_file" | cut -d'"' -f4)
        local actual_checksum=$(sha256sum "$backup_path" | cut -d' ' -f1)
        
        if [ "$stored_checksum" = "$actual_checksum" ]; then
            print_success "Backup checksum validated"
        else
            print_warn "Checksum mismatch - stored: $stored_checksum, actual: $actual_checksum"
            read -p "Continue anyway? (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "Restore cancelled"
                exit 0
            fi
        fi
    fi
    
    print_success "Backup validation passed"
}

# Function to create pre-restore backup
create_pre_restore_backup() {
    print_step "Creating pre-restore backup..."
    
    local pre_restore_file="pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
    local temp_path="$BACKUP_DIR/.temp_$pre_restore_file"
    
    if docker exec salesbot-postgres pg_dump -U postgres salesbot | gzip > "$temp_path" 2>/dev/null; then
        if gzip -t "$temp_path" 2>/dev/null; then
            mv "$temp_path" "$BACKUP_DIR/$pre_restore_file"
            print_success "Pre-restore backup created: $pre_restore_file"
        else
            rm -f "$temp_path"
            print_warn "Pre-restore backup integrity check failed, continuing anyway"
        fi
    else
        rm -f "$temp_path"
        print_warn "Pre-restore backup failed, continuing anyway"
    fi
}

# Function to restore database
restore_database() {
    print_step "Restoring database from backup..."
    
    local backup_path="$BACKUP_DIR/$BACKUP_FILE"
    
    # Create pre-restore backup
    create_pre_restore_backup
    
    # Drop existing database and recreate
    print_info "Dropping existing database..."
    docker exec salesbot-postgres psql -U postgres -c "DROP DATABASE IF EXISTS salesbot;"
    
    print_info "Creating new database..."
    docker exec salesbot-postgres psql -U postgres -c "CREATE DATABASE salesbot;"
    
    # Restore from backup
    print_info "Restoring data from backup..."
    if gunzip -c "$backup_path" | docker exec -i salesbot-postgres psql -U postgres -d salesbot -v ON_ERROR_STOP=1; then
        print_success "Database restored successfully"
    else
        print_error "Database restore failed"
        print_warn "Pre-restore backup is available for manual recovery"
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
    
    if [ -n "$table_count" ] && [ "$table_count" -gt "0" ]; then
        print_success "Database verification passed ($table_count tables found)"
    else
        print_error "Database verification failed: no tables found"
        return 1
    fi
    
    # Check critical tables
    local critical_tables=("Product" "Order" "TelUser" "Customer")
    local missing_tables=()
    
    for table in "${critical_tables[@]}"; do
        if ! docker exec salesbot-postgres psql -U postgres -d salesbot -t -c "SELECT 1 FROM \"$table\" LIMIT 1" >/dev/null 2>&1; then
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -gt 0 ]; then
        print_error "Missing critical tables: ${missing_tables[*]}"
        return 1
    else
        print_success "All critical tables present"
    fi
    
    # Run Prisma migrations to ensure schema is up to date
    print_info "Running Prisma migrations to ensure schema consistency..."
    if docker compose exec -T bot npx prisma migrate deploy --skip-generate; then
        print_success "Prisma migrations completed successfully"
    else
        print_warn "Prisma migrations failed, but restore may still be valid"
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
    
    # Validate backup
    validate_backup
    
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
