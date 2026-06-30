#!/bin/bash

################################################################################
# SalesBot Environment Validation Script
# 
# This script validates environment variables before deployment
# Usage: ./validate-env.sh [env_file]
# 
# Default env file: .env
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
ENV_FILE="${1:-$SCRIPT_DIR/.env}"

# Validation results
ERRORS=0
WARNINGS=0

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
    echo "║           SalesBot Environment Validation                 ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to check if env file exists
check_env_file() {
    print_step "Checking environment file..."
    
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file not found: $ENV_FILE"
        print_info "Create it from .env.example: cp .env.example .env"
        exit 1
    fi
    
    print_success "Environment file found: $ENV_FILE"
}

# Function to validate required variable
validate_required() {
    local var_name="$1"
    local var_value="$2"
    local description="$3"
    
    if [ -z "$var_value" ] || [ "$var_value" = "your_bot_token_here" ] || [ "$var_value" = "your_upload_chat_id" ] || [ "$var_value" = "your_production_bot_token_here" ] || [ "$var_value" = "your_secure_admin_password" ] || [ "$var_value" = "admin" ] && [ "$var_name" = "ADMIN_PASSWORD" ]; then
        print_error "$description is not set or using default value"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    
    print_success "$description is set"
    return 0
}

# Function to validate optional variable
validate_optional() {
    local var_name="$1"
    local var_value="$2"
    local description="$3"
    
    if [ -z "$var_value" ]; then
        print_warn "$description is not set (optional)"
        WARNINGS=$((WARNINGS + 1))
        return 0
    fi
    
    print_success "$description is set"
    return 0
}

# Function to validate password strength
validate_password() {
    local var_name="$1"
    var_value="$2"
    local description="$3"
    
    if [ ${#var_value} -lt 8 ]; then
        print_error "$description is too short (minimum 8 characters)"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    
    print_success "$description meets minimum length requirement"
    return 0
}

# Function to validate URL format
validate_url() {
    local var_name="$1"
    local var_value="$2"
    local description="$3"
    
    if [ -n "$var_value" ] && ! [[ "$var_value" =~ ^https?:// ]]; then
        print_error "$description has invalid URL format (must start with http:// or https://)"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    
    if [ -n "$var_value" ]; then
        print_success "$description has valid format"
    fi
    
    return 0
}

# Function to validate database URL
validate_database_url() {
    local var_value="$1"
    
    if [ -z "$var_value" ]; then
        print_error "DATABASE_URL is not set"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    
    if ! [[ "$var_value" =~ ^postgresql:// ]]; then
        print_error "DATABASE_URL has invalid format (must start with postgresql://)"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    
    print_success "DATABASE_URL has valid format"
    return 0
}

# Function to validate storage configuration
validate_storage() {
    local storage_type="$1"
    local aws_access_key="$2"
    local aws_secret_key="$3"
    local aws_region="$4"
    local aws_bucket="$5"
    
    if [ "$storage_type" = "s3" ]; then
        if [ -z "$aws_access_key" ]; then
            print_error "AWS_ACCESS_KEY_ID is required when STORAGE_TYPE=s3"
            ERRORS=$((ERRORS + 1))
        fi
        
        if [ -z "$aws_secret_key" ]; then
            print_error "AWS_SECRET_ACCESS_KEY is required when STORAGE_TYPE=s3"
            ERRORS=$((ERRORS + 1))
        fi
        
        if [ -z "$aws_region" ]; then
            print_error "AWS_REGION is required when STORAGE_TYPE=s3"
            ERRORS=$((ERRORS + 1))
        fi
        
        if [ -z "$aws_bucket" ]; then
            print_error "AWS_S3_BUCKET is required when STORAGE_TYPE=s3"
            ERRORS=$((ERRORS + 1))
        fi
        
        if [ -n "$aws_access_key" ] && [ -n "$aws_secret_key" ] && [ -n "$aws_region" ] && [ -n "$aws_bucket" ]; then
            print_success "S3 configuration is complete"
        fi
    else
        print_success "Local storage configuration"
    fi
}

# Function to validate NODE_ENV
validate_node_env() {
    local var_value="$1"
    
    if [ "$var_value" != "development" ] && [ "$var_value" != "production" ]; then
        print_error "NODE_ENV must be either 'development' or 'production'"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    
    print_success "NODE_ENV is valid: $var_value"
    return 0
}

# Function to validate LOG_LEVEL
validate_log_level() {
    local var_value="$1"
    
    if [ "$var_value" != "debug" ] && [ "$var_value" != "info" ] && [ "$var_value" != "warn" ] && [ "$var_value" != "error" ]; then
        print_error "LOG_LEVEL must be one of: debug, info, warn, error"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
    
    print_success "LOG_LEVEL is valid: $var_value"
    return 0
}

# Main validation process
main() {
    print_banner
    
    print_info "Validating environment configuration..."
    echo ""
    
    # Check env file
    check_env_file
    
    # Load environment variables
    source "$ENV_FILE"
    
    echo ""
    print_step "Validating required variables..."
    echo ""
    
    # Validate required variables
    validate_required "BOT_TOKEN" "$BOT_TOKEN" "Bot Token"
    validate_required "ADMIN_PASSWORD" "$ADMIN_PASSWORD" "Admin Password"
    validate_required "UPLOAD_CHAT_ID" "$UPLOAD_CHAT_ID" "Upload Chat ID"
    
    # Validate password strength
    validate_password "ADMIN_PASSWORD" "$ADMIN_PASSWORD" "Admin Password"
    validate_password "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD" "PostgreSQL Password"
    
    # Validate database URL
    validate_database_url "$DATABASE_URL"
    
    # Validate NODE_ENV
    validate_node_env "$NODE_ENV"
    
    # Validate LOG_LEVEL
    validate_log_level "$LOG_LEVEL"
    
    echo ""
    print_step "Validating optional variables..."
    echo ""
    
    # Validate optional variables
    validate_optional "WEBHOOK_URL" "$WEBHOOK_URL" "Webhook URL"
    validate_url "WEBHOOK_URL" "$WEBHOOK_URL" "Webhook URL"
    
    validate_optional "ALLOWED_ORIGINS" "$ALLOWED_ORIGINS" "Allowed Origins"
    
    echo ""
    print_step "Validating storage configuration..."
    echo ""
    
    # Validate storage configuration
    validate_storage "$STORAGE_TYPE" "$AWS_ACCESS_KEY_ID" "$AWS_SECRET_ACCESS_KEY" "$AWS_REGION" "$AWS_S3_BUCKET"
    
    echo ""
    print_step "Validating production-specific requirements..."
    echo ""
    
    # Production-specific validations
    if [ "$NODE_ENV" = "production" ]; then
        if [ -z "$WEBHOOK_URL" ]; then
            print_error "WEBHOOK_URL is required in production"
            ERRORS=$((ERRORS + 1))
        else
            print_success "WEBHOOK_URL is set for production"
        fi
        
        if [ "$ADMIN_PASSWORD" = "admin" ]; then
            print_error "ADMIN_PASSWORD must be changed from default in production"
            ERRORS=$((ERRORS + 1))
        fi
        
        if [ "$POSTGRES_PASSWORD" = "postgres" ]; then
            print_error "POSTGRES_PASSWORD must be changed from default in production"
            ERRORS=$((ERRORS + 1))
        fi
        
        if [ "$LOG_LEVEL" = "debug" ]; then
            print_warn "LOG_LEVEL should be 'info' or 'warn' in production"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
    
    # Print summary
    echo ""
    if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}${BOLD}║         Environment Validation Passed!                    ║${NC}"
        echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        return 0
    elif [ $ERRORS -eq 0 ]; then
        echo -e "${YELLOW}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}${BOLD}║      Environment Validation Passed with Warnings         ║${NC}"
        echo -e "${YELLOW}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        print_warn "Warnings: $WARNINGS"
        echo ""
        return 0
    else
        echo -e "${RED}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}${BOLD}║           Environment Validation Failed!                   ║${NC}"
        echo -e "${RED}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        print_error "Errors: $ERRORS"
        print_warn "Warnings: $WARNINGS"
        echo ""
        print_info "Please fix the errors before deploying"
        echo ""
        return 1
    fi
}

# Run main function
main
