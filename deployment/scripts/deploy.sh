#!/bin/bash
# HealthCare API Production Deployment Script
# Automates the deployment process with safety checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$HOME/healthcare-api"
BACKUP_DIR="$HOME/healthcare-backups"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_user() {
    if [ "$EUID" -eq 0 ]; then
        error "Don't run this script as root!"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if user is in docker group
    if ! groups $USER | grep -q docker; then
        error "User $USER is not in the docker group"
        exit 1
    fi
    
    # Check if Traefik network exists
    if ! docker network ls | grep -q traefik-proxy; then
        error "Traefik network 'traefik-proxy' does not exist"
        echo "Create it with: docker network create traefik-proxy"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Backup current deployment
backup_current() {
    log "Creating backup of current deployment..."
    
    mkdir -p "$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)"
    
    # Backup database
    if docker ps | grep -q healthcare-mongodb-prod; then
        log "Backing up MongoDB..."
        docker exec healthcare-mongodb-prod mongodump --out /data/backup
        docker cp healthcare-mongodb-prod:/data/backup "$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)/mongodb"
    fi
    
    # Backup application files
    if [ -d "$PROJECT_DIR" ]; then
        cp -r "$PROJECT_DIR" "$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)/app"
    fi
    
    success "Backup completed"
}

# Pull latest code
update_code() {
    log "Updating application code..."
    
    cd "$PROJECT_DIR"
    
    # Stash any local changes
    if [ -d ".git" ]; then
        git stash
        git pull origin main
        success "Code updated from repository"
    else
        warning "Not a git repository, skipping code update"
    fi
}

# Build and deploy
deploy() {
    log "Starting deployment..."
    
    cd "$PROJECT_DIR/deployment"
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found"
        echo "Copy from .env.production.template and configure your values"
        exit 1
    fi
    
    # Build new images
    log "Building application images..."
    docker compose -f "$COMPOSE_FILE" build --no-cache
    
    # Stop old containers
    log "Stopping old containers..."
    docker compose -f "$COMPOSE_FILE" down
    
    # Start new containers
    log "Starting new containers..."
    docker compose -f "$COMPOSE_FILE" up -d
    
    success "Deployment completed"
}

# Health check
health_check() {
    log "Performing health checks..."
    
    # Wait for services to start
    sleep 30
    
    # Check API health
    HEALTH_URL="http://localhost:3001/health"
    if curl -f "$HEALTH_URL" &> /dev/null; then
        success "API health check passed"
    else
        error "API health check failed"
        return 1
    fi
    
    # Check database connection
    if docker exec healthcare-mongodb-prod mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
        success "Database health check passed"
    else
        error "Database health check failed"
        return 1
    fi
    
    # Check Redis connection
    if docker exec healthcare-redis-prod redis-cli ping &> /dev/null; then
        success "Redis health check passed"
    else
        error "Redis health check failed"
        return 1
    fi
    
    success "All health checks passed"
}

# Rollback function
rollback() {
    error "Deployment failed, rolling back..."
    
    cd "$PROJECT_DIR/deployment"
    
    # Stop failed containers
    docker compose -f "$COMPOSE_FILE" down
    
    # Restore from backup if available
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
        log "Restoring from backup: $LATEST_BACKUP"
        # Add rollback logic here
    fi
    
    error "Rollback completed"
    exit 1
}

# Cleanup old images and volumes
cleanup() {
    log "Cleaning up old Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    success "Cleanup completed"
}

# Main deployment flow
main() {
    log "Starting HealthCare API deployment..."
    
    check_user
    check_prerequisites
    
    # Trap errors and rollback
    trap rollback ERR
    
    backup_current
    update_code
    deploy
    
    # Remove error trap before health check
    trap - ERR
    
    if health_check; then
        cleanup
        success "Deployment completed successfully!"
        
        log "Service URLs:"
        echo "  - API: https://api.yourdomain.com"
        echo "  - Health: https://api.yourdomain.com/health"
        echo "  - Docs: https://api.yourdomain.com/api-docs"
        
        log "Useful commands:"
        echo "  - View logs: docker compose -f $COMPOSE_FILE logs -f"
        echo "  - Check status: docker compose -f $COMPOSE_FILE ps"
        echo "  - Run backup: docker compose -f $COMPOSE_FILE --profile backup run --rm mongodb-backup"
    else
        rollback
    fi
}

# Script options
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "backup")
        backup_current
        ;;
    "health")
        health_check
        ;;
    "cleanup")
        cleanup
        ;;
    "rollback")
        rollback
        ;;
    *)
        echo "Usage: $0 [deploy|backup|health|cleanup|rollback]"
        exit 1
        ;;
esac