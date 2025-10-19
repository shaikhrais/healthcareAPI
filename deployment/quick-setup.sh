#!/bin/bash
# HealthCare API - Quick Setup Commands

set -e

echo "🏥 HealthCare API - Quick Deployment Commands"
echo "============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

show_usage() {
    echo -e "${BLUE}Usage:${NC}"
    echo "  ./quick-setup.sh install <domain> <email>    # Install complete stack"
    echo "  ./quick-setup.sh start                       # Start all services"
    echo "  ./quick-setup.sh stop                        # Stop all services"
    echo "  ./quick-setup.sh status                      # Check service status"
    echo "  ./quick-setup.sh logs [service]              # View logs"
    echo "  ./quick-setup.sh scale <replicas>            # Scale API instances"
    echo "  ./quick-setup.sh update                      # Update containers"
    echo "  ./quick-setup.sh backup                      # Create backup"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  ./quick-setup.sh install healthcare.mydomain.com admin@mydomain.com"
    echo "  ./quick-setup.sh scale 4"
    echo "  ./quick-setup.sh logs api"
}

install_docker() {
    echo -e "${YELLOW}Installing Docker...${NC}"
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        echo -e "${GREEN}✅ Docker installed${NC}"
        echo "⚠️  Please log out and back in, then re-run this script"
        exit 0
    else
        echo -e "${GREEN}✅ Docker already installed${NC}"
    fi
}

install_stack() {
    local domain="${1:-yourdomain.example}"
    local email="${2:-you@example.com}"
    
    if [ "$domain" = "yourdomain.example" ] || [ "$email" = "you@example.com" ]; then
        echo "❌ Please provide your actual domain and email:"
        echo "   ./quick-setup.sh install healthcare.mydomain.com admin@mydomain.com"
        exit 1
    fi
    
    echo -e "${YELLOW}Installing HealthCare API Stack for $domain...${NC}"
    
    # Download and run installer
    if [ -f "install_healthcare_stack.sh" ]; then
        ./install_healthcare_stack.sh "$domain" "$email"
    else
        echo "❌ install_healthcare_stack.sh not found!"
        echo "Please ensure the installer script is in the current directory."
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ Installation complete!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Configure ~/healthcare-stack/api/.env with your MongoDB Atlas URI"
    echo "2. Set up DNS A records for:"
    echo "   - api.$domain → your public IP"
    echo "   - mon.$domain → your public IP"
    echo "3. Port-forward only 80/443 to this server"
    echo "4. Start the stack: ./quick-setup.sh start"
}

start_stack() {
    echo -e "${YELLOW}Starting HealthCare API Stack...${NC}"
    
    if [ ! -d "$HOME/healthcare-stack" ]; then
        echo "❌ HealthCare stack not found. Run install first:"
        echo "   ./quick-setup.sh install yourdomain.com you@email.com"
        exit 1
    fi
    
    cd "$HOME/healthcare-stack"
    
    # Create network
    docker network create healthcare-network 2>/dev/null || true
    
    # Start services in order
    echo "🔀 Starting Traefik..."
    cd traefik && docker compose up -d
    sleep 5
    
    echo "🏥 Starting HealthCare API..."
    cd ../api && docker compose up -d
    sleep 3
    
    echo "📊 Starting Monitor Dashboard..."
    cd ../monitor-app && docker compose up -d
    sleep 3
    
    echo "📈 Starting Netdata..."
    cd ../monitor && docker compose -f netdata.yml up -d
    
    cd ..
    echo ""
    echo -e "${GREEN}✅ HealthCare API Stack Started!${NC}"
    echo ""
    echo "🌐 Services:"
    echo "  - API: Check with './quick-setup.sh status'"
    echo "  - Monitor: Check with './quick-setup.sh status'"
    echo ""
}

stop_stack() {
    echo -e "${YELLOW}Stopping HealthCare API Stack...${NC}"
    
    if [ ! -d "$HOME/healthcare-stack" ]; then
        echo "❌ HealthCare stack not found."
        exit 1
    fi
    
    cd "$HOME/healthcare-stack"
    
    echo "📈 Stopping Netdata..."
    cd monitor && docker compose -f netdata.yml down 2>/dev/null || true
    
    echo "📊 Stopping Monitor..."
    cd ../monitor-app && docker compose down 2>/dev/null || true
    
    echo "🏥 Stopping API..."
    cd ../api && docker compose down 2>/dev/null || true
    
    echo "🔀 Stopping Traefik..."
    cd ../traefik && docker compose down 2>/dev/null || true
    
    echo -e "${GREEN}✅ HealthCare API Stack Stopped!${NC}"
}

show_status() {
    echo -e "${YELLOW}HealthCare API Stack Status${NC}"
    echo "=========================="
    echo ""
    
    # Check network
    if docker network ls | grep -q healthcare-network; then
        echo -e "${GREEN}✅${NC} Healthcare network: exists"
    else
        echo -e "❌ Healthcare network: missing"
    fi
    
    echo ""
    echo "📊 Container Status:"
    if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(traefik|healthcare|monitor|netdata)" > /dev/null; then
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(traefik|healthcare|monitor|netdata|NAME)"
    else
        echo "No HealthCare containers running"
    fi
    
    echo ""
    echo "🌐 Service Health:"
    
    # Get domain from traefik container labels if possible
    DOMAIN=$(docker inspect traefik-healthcare 2>/dev/null | jq -r '.[0].Config.Labels."traefik.http.routers.dashboard.rule"' | sed 's/Host(\`//g' | sed 's/\`)//g' | sed 's/traefik\.//' 2>/dev/null || echo "")
    
    if [ -z "$DOMAIN" ]; then
        echo "⚠️  Domain not detected from containers"
        DOMAIN="yourdomain.com"
    fi
    
    # Check Traefik API
    if curl -s --max-time 3 http://localhost:8080/ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} Traefik: healthy"
    else
        echo "❌ Traefik: unhealthy"
    fi
    
    # Check API
    if curl -s --max-time 5 "https://api.$DOMAIN/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} HealthCare API: healthy (https://api.$DOMAIN)"
    elif curl -s --max-time 5 "http://localhost:3001/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} HealthCare API: healthy (local only)"
    else
        echo "❌ HealthCare API: unhealthy"
    fi
    
    # Check Monitor
    if curl -s --max-time 3 "https://mon.$DOMAIN/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} Monitor Dashboard: healthy (https://mon.$DOMAIN)"
    else
        echo "❌ Monitor Dashboard: unhealthy"
    fi
    
    # Check Netdata
    if curl -s --max-time 3 http://localhost:19999/api/v1/info > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} Netdata: healthy (http://localhost:19999)"
    else
        echo "❌ Netdata: unhealthy"
    fi
    
    echo ""
    echo "📈 Quick Stats:"
    echo "  - CPU Load: $(uptime | awk -F'load average:' '{print $2}' | xargs)"
    echo "  - Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
    echo "  - Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"
}

show_logs() {
    local service="${1:-all}"
    
    if [ ! -d "$HOME/healthcare-stack" ]; then
        echo "❌ HealthCare stack not found."
        exit 1
    fi
    
    cd "$HOME/healthcare-stack"
    
    case "$service" in
        "api"|"healthcare")
            echo "📋 HealthCare API Logs:"
            cd api && docker compose logs -f --tail=100
            ;;
        "traefik")
            echo "📋 Traefik Logs:"
            cd traefik && docker compose logs -f --tail=100
            ;;
        "monitor")
            echo "📋 Monitor App Logs:"
            cd monitor-app && docker compose logs -f --tail=100
            ;;
        "netdata")
            echo "📋 Netdata Logs:"
            cd monitor && docker compose -f netdata.yml logs -f --tail=100
            ;;
        "all"|*)
            echo "📋 Available Services:"
            echo "  - api (HealthCare API)"
            echo "  - traefik (Reverse Proxy)"
            echo "  - monitor (Monitor Dashboard)"
            echo "  - netdata (System Metrics)"
            echo ""
            echo "Usage: ./quick-setup.sh logs [service]"
            echo "Example: ./quick-setup.sh logs api"
            echo ""
            echo "Current containers:"
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
            ;;
    esac
}

scale_api() {
    local replicas="${1:-2}"
    
    if [ ! -d "$HOME/healthcare-stack" ]; then
        echo "❌ HealthCare stack not found."
        exit 1
    fi
    
    echo -e "${YELLOW}Scaling HealthCare API to $replicas instances...${NC}"
    
    cd "$HOME/healthcare-stack/api"
    docker compose up -d --scale healthcare-api="$replicas"
    
    echo -e "${GREEN}✅${NC} API scaled to $replicas instances"
    echo ""
    echo "📊 Container Status:"
    docker ps | grep healthcare-api
}

update_stack() {
    echo -e "${YELLOW}Updating HealthCare API Stack...${NC}"
    
    if [ ! -d "$HOME/healthcare-stack" ]; then
        echo "❌ HealthCare stack not found."
        exit 1
    fi
    
    cd "$HOME/healthcare-stack"
    
    echo "🔄 Pulling latest images..."
    cd traefik && docker compose pull
    cd ../api && docker compose pull
    cd ../monitor-app && docker compose pull
    cd ../monitor && docker compose -f netdata.yml pull
    
    echo "🔄 Restarting services..."
    cd ../traefik && docker compose up -d
    cd ../api && docker compose up -d
    cd ../monitor-app && docker compose up -d
    cd ../monitor && docker compose -f netdata.yml up -d
    
    echo -e "${GREEN}✅${NC} Update complete!"
}

backup_data() {
    echo -e "${YELLOW}Creating backup...${NC}"
    
    BACKUP_DIR="$HOME/healthcare-backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup configuration
    if [ -d "$HOME/healthcare-stack" ]; then
        echo "📁 Backing up configuration..."
        cp -r "$HOME/healthcare-stack" "$BACKUP_DIR/config"
    fi
    
    # Backup Docker volumes (if any)
    echo "💾 Backing up Docker volumes..."
    docker volume ls --format "{{.Name}}" | grep healthcare > "$BACKUP_DIR/volumes.list" || true
    
    # Create archive
    echo "📦 Creating archive..."
    cd "$HOME/healthcare-backups"
    tar -czf "healthcare_backup_$(date +%Y%m%d_%H%M%S).tar.gz" "$(basename "$BACKUP_DIR")"
    rm -rf "$BACKUP_DIR"
    
    echo -e "${GREEN}✅${NC} Backup created in $HOME/healthcare-backups/"
    ls -la "$HOME/healthcare-backups/"*.tar.gz | tail -1
}

# Main command handling
case "${1:-help}" in
    "install")
        install_docker
        install_stack "$2" "$3"
        ;;
    "start")
        start_stack
        ;;
    "stop")
        stop_stack
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "scale")
        scale_api "$2"
        ;;
    "update")
        update_stack
        ;;
    "backup")
        backup_data
        ;;
    "help"|*)
        show_usage
        ;;
esac