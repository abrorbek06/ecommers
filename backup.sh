#!/bin/bash

################################################################################
# SalesBot Backup Script
# 
# This script creates PostgreSQL database backups
# Usage: ./backup.sh [manual]
# 
# The 'manual' argument skips the retention policy and creates a backup
# without deleting old backups
################################################################################

set -euo pipefail
trap 'print_error "Backup failed at line $LINENO"; exit 1' ERR

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
RETENTION_DAYS=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="salesbot_backup_${TIMESTAMP}.sql.gz"
MANUAL_MODE=false

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
    echo "║                 SalesBot Backup Script                     ║"
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
    if [ "$1" = "manual" ]; then
        MANUAL_MODE=true
        print_info "Manual mode: retention policy disabled"
    fi
}

# Function to create backup directory
create_backup_dir() {
    print_step "Creating backup directory..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        print_success "Backup directory created"
    else
        print_info "Backup directory already exists"
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

# Function to create database backup
create_backup() {
    print_step "Creating database backup..."
    
    local backup_path="$BACKUP_DIR/$BACKUP_FILE"
    local temp_path="$BACKUP_DIR/.temp_$BACKUP_FILE"
    
    # Get database credentials from .env safely
    if [ -f "$SCRIPT_DIR/.env" ]; then
        set -a
        . "$SCRIPT_DIR/.env"
        set +a
    fi
    
    # Extract password from DATABASE_URL if not set
    if [ -z "$POSTGRES_PASSWORD" ] && [ -n "$DATABASE_URL" ]; then
        POSTGRES_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\([^:]*\)@.*/\1/p')
    fi
    
    # Check if PostgreSQL container is running
    if ! docker ps | grep -q salesbot-postgres; then
        print_error "PostgreSQL container is not running"
        exit 1
    fi
    
    # Create backup using docker exec to temp file first
    print_info "Running pg_dump..."
    if docker exec salesbot-postgres pg_dump -U postgres --no-owner --no-acl salesbot | gzip > "$temp_path"; then
        # Verify backup integrity
        print_info "Verifying backup integrity..."
        if gzip -t "$temp_path" 2>/dev/null; then
            mv "$temp_path" "$backup_path"
            local backup_size=$(du -h "$backup_path" | cut -f1)
            print_success "Backup created successfully: $BACKUP_FILE ($backup_size)"
        else
            print_error "Backup integrity check failed"
            rm -f "$temp_path"
            exit 1
        fi
    else
        print_error "Backup creation failed"
        rm -f "$temp_path"
        exit 1
    fi
}

# Function to clean old backups
clean_old_backups() {
    if [ "$MANUAL_MODE" = true ]; then
        print_info "Manual mode: skipping old backup cleanup"
        return 0
    fi
    
    print_step "Cleaning old backups (retention: $RETENTION_DAYS days)..."
    
    local deleted_count=0
    
    # Find and delete backups older than retention period, but keep at least 1 backup
    local backup_count=$(find "$BACKUP_DIR" -name "salesbot_backup_*.sql.gz" -type f | wc -l)
    
    if [ $backup_count -le 1 ]; then
        print_info "Only 1 backup exists, skipping cleanup"
        return 0
    fi
    
    while IFS= read -r -d '' file; do
        print_info "Deleting old backup: $(basename "$file")"
        # Also delete corresponding metadata file if exists
        local base_name=$(basename "$file" .sql.gz)
        rm -f "$file" "$BACKUP_DIR/backup_${base_name#salesbot_backup_}.json"
        deleted_count=$((deleted_count + 1))
    done < <(find "$BACKUP_DIR" -name "salesbot_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -print0)
    
    if [ $deleted_count -gt 0 ]; then
        print_success "Deleted $deleted_count old backup(s)"
    else
        print_info "No old backups to delete"
    fi
}

# Function to create backup metadata
create_metadata() {
    print_step "Creating backup metadata..."
    
    local metadata_file="$BACKUP_DIR/backup_${TIMESTAMP}.json"
    local checksum=$(sha256sum "$BACKUP_DIR/$BACKUP_FILE" | cut -d' ' -f1)
    local size_bytes=$(stat -c%s "$BACKUP_DIR/$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_DIR/$BACKUP_FILE")
    
    cat > "$metadata_file" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "backup_file": "$BACKUP_FILE",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "database": "salesbot",
  "retention_days": $RETENTION_DAYS,
  "manual_mode": $MANUAL_MODE,
  "sha256_checksum": "$checksum",
  "size_bytes": $size_bytes,
  "postgres_version": "$(docker exec salesbot-postgres psql -U postgres -t -c 'SELECT version()' 2>/dev/null | head -1 | xargs)"
}
EOF
    
    print_success "Backup metadata created"
}

# Function to print summary
print_summary() {
    echo ""
    echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║           Backup Completed Successfully!                   ║${NC}"
    echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Backup Details:${NC}"
    echo -e "  ${GREEN}✓${NC} File: $BACKUP_FILE"
    echo -e "  ${GREEN}✓${NC} Location: $BACKUP_DIR"
    echo -e "  ${GREEN}✓${NC} Timestamp: $TIMESTAMP"
    echo -e "  ${GREEN}✓${NC} Retention: $RETENTION_DAYS days"
    echo ""
    echo -e "${BOLD}Useful Commands:${NC}"
    echo "  List backups:    ls -lh $BACKUP_DIR"
    echo "  Restore backup:  ./restore.sh $BACKUP_FILE"
    echo "  Manual backup:   ./backup.sh manual"
    echo ""
}

# Main backup process
main() {
    print_banner
    
    # Check if running as root
    check_root
    
    # Parse arguments
    parse_args "$1"
    
    print_info "Starting SalesBot backup..."
    echo ""
    
    # Create backup directory
    create_backup_dir
    
    # Check PostgreSQL container
    check_postgres_container
    
    # Create backup
    create_backup
    
    # Create metadata
    create_metadata
    
    # Clean old backups
    clean_old_backups
    
    # Print summary
    print_summary
}

# Run main function
main "$@"
