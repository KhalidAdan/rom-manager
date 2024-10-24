#!/bin/bash

# Exit on any error
set -e

DEPLOY_LOG="/var/log/deployments/deploy-$(date +%Y%m%d-%H%M%S).log"
mkdir -p /var/log/deployments

# Function for logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DEPLOY_LOG"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log "Error: Docker is not running"
        exit 1
    fi
}

# Backup current .env (optional)
backup_env() {
    if [ -f .env ]; then
        cp .env ".env.backup.$(date +%Y%m%d_%H%M%S)"
        log "Backed up .env file"
    fi
}

# Main deployment
deploy() {
    log "Starting deployment..."
    
    # Verify docker is running
    check_docker
    
    # Stop running containers
    log "Stopping containers..."
    sudo docker compose down || {
        log "Error stopping containers"
        exit 1
    }
    
    # Cleanup
    log "Cleaning up Docker system..."
    sudo docker system prune -af --volumes || {
        log "Warning: Cleanup incomplete"
    }
    
    # Pull latest images (if using remote images)
    log "Pulling latest images..."
    sudo docker compose pull || {
        log "Warning: Pull incomplete"
    }
    
    # Build and start
    log "Building and starting containers..."
    sudo docker compose up --build -d || {
        log "Error during build/start"
        exit 1
    }
    
    # Verify containers are running
    sleep 5
    if ! sudo docker compose ps | grep -q "Up"; then
        log "Error: Containers failed to start properly"
        exit 1
    fi
    
    log "Deployment completed successfully"
}

# Cleanup old logs (keep last 10)
cleanup_logs() {
    ls -t /var/log/deployments/deploy-*.log | tail -n +11 | xargs rm -f 2>/dev/null || true
}

# Execute deployment with error handling
{
    backup_env
    deploy
    cleanup_logs
} || {
    log "Deployment failed! Check logs at $DEPLOY_LOG"
    exit 1
}

# Show container status
log "Current container status:"
sudo docker compose ps