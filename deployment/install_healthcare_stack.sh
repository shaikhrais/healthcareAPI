#!/usr/bin/env bash
# HealthCare API - One-Shot Production Stack Installer
# Deploys Traefik + HealthCare API + Netdata + Custom Monitor
set -euo pipefail

DOMAIN="${1:-yourdomain.example}"                # required: set your domain or DDNS name
EMAIL="${2:-you@example.com}"                    # email for Let's Encrypt

echo "🏥 Installing HealthCare API Production Stack"
echo "📍 Domain: $DOMAIN"
echo "📧 Email: $EMAIL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅${NC} $1"; }
warning() { echo -e "${YELLOW}⚠️${NC} $1"; }
error() { echo -e "${RED}❌${NC} $1"; }

# 1) Create folder structure
log "Creating folder structure..."
mkdir -p ~/healthcare-stack/{traefik,api,monitor,monitor-app}
mkdir -p ~/healthcare-stack/traefik/letsencrypt
mkdir -p ~/healthcare-stack/api/logs

# 2) Traefik (TLS + routing on 80/443)
log "Setting up Traefik reverse proxy..."
cat > ~/healthcare-stack/traefik/docker-compose.yml <<YAML
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik-healthcare
    command:
      - --api.dashboard=true
      - --api.insecure=false
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --providers.docker.network=healthcare-network
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --entrypoints.web.http.redirections.entrypoint.to=websecure
      - --entrypoints.web.http.redirections.entrypoint.scheme=https
      - --entrypoints.web.http.redirections.entrypoint.permanent=true
      - --certificatesresolvers.le.acme.tlschallenge=true
      - --certificatesresolvers.le.acme.email=${EMAIL}
      - --certificatesresolvers.le.acme.storage=/letsencrypt/acme.json
      - --log.level=INFO
      - --accesslog=true
      - --metrics.prometheus=true
    ports: 
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - healthcare-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(\`traefik.${DOMAIN}\`)"
      - "traefik.http.routers.dashboard.entrypoints=websecure"
      - "traefik.http.routers.dashboard.tls.certresolver=le"
      - "traefik.http.routers.dashboard.service=api@internal"
    restart: unless-stopped

networks:
  healthcare-network:
    external: true
YAML

# Create acme.json with proper permissions
touch ~/healthcare-stack/traefik/letsencrypt/acme.json
chmod 600 ~/healthcare-stack/traefik/letsencrypt/acme.json

# 3) HealthCare API Configuration
log "Setting up HealthCare API..."
cat > ~/healthcare-stack/api/docker-compose.yml <<YAML
version: '3.8'

services:
  healthcare-api:
    image: healthcare-api:latest
    build:
      context: .
      dockerfile: Dockerfile
    container_name: healthcare-api
    env_file: .env
    deploy:
      replicas: 2
    volumes:
      - ./logs:/app/logs
      - api_uploads:/app/uploads
    networks:
      - healthcare-network
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=healthcare-network"
      
      # Main API routes
      - "traefik.http.routers.healthcare-api.rule=Host(\`api.${DOMAIN}\`) || Host(\`${DOMAIN}\`)"
      - "traefik.http.routers.healthcare-api.entrypoints=websecure"
      - "traefik.http.routers.healthcare-api.tls.certresolver=le"
      - "traefik.http.services.healthcare-api.loadbalancer.server.port=3001"
      
      # Health check route with higher priority
      - "traefik.http.routers.healthcare-health.rule=Host(\`api.${DOMAIN}\`) && Path(\`/health\`)"
      - "traefik.http.routers.healthcare-health.entrypoints=websecure"
      - "traefik.http.routers.healthcare-health.tls.certresolver=le"
      - "traefik.http.routers.healthcare-health.priority=100"
      
      # Security headers and rate limiting
      - "traefik.http.routers.healthcare-api.middlewares=healthcare-security,healthcare-ratelimit"
      - "traefik.http.middlewares.healthcare-security.headers.frameDeny=true"
      - "traefik.http.middlewares.healthcare-security.headers.sslRedirect=true"
      - "traefik.http.middlewares.healthcare-security.headers.browserXssFilter=true"
      - "traefik.http.middlewares.healthcare-security.headers.contentTypeNosniff=true"
      - "traefik.http.middlewares.healthcare-security.headers.forceSTSHeader=true"
      - "traefik.http.middlewares.healthcare-security.headers.stsIncludeSubdomains=true"
      - "traefik.http.middlewares.healthcare-security.headers.stsPreload=true"
      - "traefik.http.middlewares.healthcare-security.headers.stsSeconds=31536000"
      - "traefik.http.middlewares.healthcare-security.headers.customRequestHeaders.X-Forwarded-Proto=https"
      
      # Rate limiting
      - "traefik.http.middlewares.healthcare-ratelimit.ratelimit.average=100"
      - "traefik.http.middlewares.healthcare-ratelimit.ratelimit.burst=200"
      - "traefik.http.middlewares.healthcare-ratelimit.ratelimit.period=1m"
    
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    restart: unless-stopped

volumes:
  api_uploads:

networks:
  healthcare-network:
    external: true
YAML

# Production environment configuration
cat > ~/healthcare-stack/api/.env <<ENV
# HealthCare API Production Environment
NODE_ENV=production
PORT=3001

# Domain Configuration
DOMAIN=${DOMAIN}
API_URL=https://api.${DOMAIN}
FRONTEND_URL=https://${DOMAIN}

# MongoDB Atlas Configuration (EDIT THIS!)
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/healthcare?retryWrites=true&w=majority&appName=healthcare-api

# Security (CHANGE THESE!)
JWT_SECRET=healthcare_jwt_secret_change_this_to_something_secure_32_chars_minimum
SESSION_SECRET=healthcare_session_secret_change_this_to_something_secure_32_chars
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=1000

# Email Configuration (EDIT THESE!)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@${DOMAIN}
SENDGRID_FROM_NAME=HealthCare Team

# Payment Processing (EDIT THESE!)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here

# SMS Configuration (EDIT THESE!)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Security Settings
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME_HOURS=2
PASSWORD_RESET_EXPIRY_MINUTES=30

# Application Settings
APP_NAME=HealthCare Management API
ENABLE_SWAGGER_DOCS=false
ENABLE_WEBSOCKETS=true
TIMEZONE=America/New_York

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
ENV

# Dockerfile for HealthCare API
cat > ~/healthcare-stack/api/Dockerfile <<DOCKER
FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S healthcare -u 1001

# Create logs directory and set permissions
RUN mkdir -p /app/logs /app/uploads && chown -R healthcare:nodejs /app

USER healthcare

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server.js"]
DOCKER

# 4) Netdata (live system dashboard; keep private)
log "Setting up Netdata monitoring..."
cat > ~/healthcare-stack/monitor/netdata.yml <<YAML
version: '3.8'

services:
  netdata:
    image: netdata/netdata:latest
    container_name: netdata-healthcare
    hostname: healthcare-server
    pid: host
    network_mode: host
    cap_add: 
      - SYS_PTRACE
      - SYS_ADMIN
    security_opt:
      - apparmor:unconfined
    volumes:
      - netdataconfig:/etc/netdata
      - netdatalib:/var/lib/netdata
      - netdatacache:/var/cache/netdata
      - /etc/passwd:/host/etc/passwd:ro
      - /etc/group:/host/etc/group:ro
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /etc/os-release:/host/etc/os-release:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - NETDATA_CLAIM_TOKEN=${NETDATA_CLAIM_TOKEN:-}
      - NETDATA_CLAIM_URL=https://app.netdata.cloud
    restart: unless-stopped

volumes:
  netdataconfig:
  netdatalib:
  netdatacache:
YAML

# 5) Custom Monitor App (backend + frontend) at mon.DOMAIN
log "Setting up custom monitor dashboard..."
mkdir -p ~/healthcare-stack/monitor-app/{backend,frontend}

# Monitor backend
cat > ~/healthcare-stack/monitor-app/backend/Dockerfile <<DOCKER
FROM node:20-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
USER node
EXPOSE 8088
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8088/api/health || exit 1
CMD ["node","index.js"]
DOCKER

cat > ~/healthcare-stack/monitor-app/backend/package.json <<PKG
{
  "name": "healthcare-monitor-backend",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "dockerode": "^4.0.2",
    "express": "^4.19.2",
    "node-fetch": "^3.3.2",
    "cors": "^2.8.5"
  }
}
PKG

cat > ~/healthcare-stack/monitor-app/backend/index.js <<JS
import express from "express";
import cors from "cors";
import Docker from "dockerode";
import fetch from "node-fetch";
import os from "os";

const app = express();
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

app.use(cors());
app.use(express.json());

// Health check for this service
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "healthcare-monitor", time: new Date().toISOString() });
});

// Check HealthCare API health
async function checkApiHealth() {
  try {
    const response = await fetch("https://api.${DOMAIN}/health", { 
      timeout: 4000,
      headers: { 'User-Agent': 'HealthCare-Monitor/1.0' }
    });
    const data = await response.json();
    return { healthy: response.ok, data, responseTime: Date.now() };
  } catch (error) {
    return { healthy: false, error: error.message, responseTime: null };
  }
}

// Get system metrics
function getSystemMetrics() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  return {
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown'
    },
    memory: {
      total: Math.round(totalMem / 1024 / 1024 / 1024 * 100) / 100, // GB
      used: Math.round(usedMem / 1024 / 1024 / 1024 * 100) / 100,   // GB
      free: Math.round(freeMem / 1024 / 1024 / 1024 * 100) / 100,   // GB
      usagePercent: Math.round((usedMem / totalMem) * 100)
    },
    uptime: Math.round(os.uptime()),
    loadAverage: os.loadavg()
  };
}

// Main metrics endpoint
app.get("/api/metrics", async (_req, res) => {
  try {
    const [containers, apiHealth] = await Promise.all([
      docker.listContainers({ all: false }),
      checkApiHealth()
    ]);
    
    const containerInfo = containers.map(c => ({
      id: c.Id.substring(0, 12),
      name: c.Names[0]?.replace('/', '') || 'unnamed',
      image: c.Image,
      state: c.State,
      status: c.Status,
      created: new Date(c.Created * 1000).toISOString(),
      ports: c.Ports.map(p => (\`\${p.PublicPort || 'private'}:\${p.PrivatePort}\`)).join(', ') || 'none'
    }));

    const systemMetrics = getSystemMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      api: {
        healthy: apiHealth.healthy,
        url: "https://api.${DOMAIN}",
        responseTime: apiHealth.responseTime,
        error: apiHealth.error || null,
        data: apiHealth.data || null
      },
      system: systemMetrics,
      containers: {
        total: containers.length,
        running: containers.filter(c => c.State === 'running').length,
        details: containerInfo
      }
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: error.message, timestamp: new Date().toISOString() });
  }
});

// Docker stats endpoint
app.get("/api/docker-stats", async (_req, res) => {
  try {
    const containers = await docker.listContainers();
    const stats = await Promise.all(
      containers.map(async (containerInfo) => {
        try {
          const container = docker.getContainer(containerInfo.Id);
          const stat = await container.stats({ stream: false });
          return {
            name: containerInfo.Names[0]?.replace('/', ''),
            id: containerInfo.Id.substring(0, 12),
            cpuPercent: calculateCPUPercent(stat),
            memoryUsage: Math.round(stat.memory_stats.usage / 1024 / 1024), // MB
            memoryLimit: Math.round(stat.memory_stats.limit / 1024 / 1024), // MB
          };
        } catch (e) {
          return { name: containerInfo.Names[0]?.replace('/', ''), error: e.message };
        }
      })
    );
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function calculateCPUPercent(stats) {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const cpuPercent = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
  return Math.round(cpuPercent * 100) / 100;
}

const port = 8088;
app.listen(port, () => {
  console.log(\`HealthCare Monitor backend listening on port \${port}\`);
});
JS

# Monitor frontend
cat > ~/healthcare-stack/monitor-app/frontend/Dockerfile <<DOCKER
FROM nginx:alpine
COPY ./dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
DOCKER

mkdir -p ~/healthcare-stack/monitor-app/frontend/dist

cat > ~/healthcare-stack/monitor-app/frontend/nginx.conf <<NGINX
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server {
        listen 80;
        root /usr/share/nginx/html;
        index index.html;
        
        # API proxy
        location /api/ {
            proxy_pass http://mon-backend:8088;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
        
        # Static files
        location / {
            try_files \$uri \$uri/ /index.html;
        }
    }
}
NGINX

cat > ~/healthcare-stack/monitor-app/frontend/dist/index.html <<HTML
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>HealthCare API Monitor</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
            margin: 0; 
            padding: 24px; 
            background: #f8f9fa; 
            color: #212529;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 32px; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 32px; }
        .card { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card h3 { margin: 0 0 16px 0; color: #495057; font-size: 18px; }
        .status-ok { color: #28a745; font-weight: 600; }
        .status-error { color: #dc3545; font-weight: 600; }
        .status-warning { color: #ffc107; font-weight: 600; }
        .metric { display: flex; justify-content: space-between; margin: 8px 0; }
        .metric-label { color: #6c757d; }
        .metric-value { font-weight: 500; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #dee2e6; }
        th { background: #f8f9fa; font-weight: 600; }
        .container-running { color: #28a745; }
        .container-stopped { color: #dc3545; }
        .progress-bar { 
            width: 100%; 
            height: 20px; 
            background: #e9ecef; 
            border-radius: 10px; 
            overflow: hidden; 
            margin: 8px 0;
        }
        .progress-fill { 
            height: 100%; 
            background: linear-gradient(90deg, #28a745, #20c997); 
            transition: width 0.3s ease;
        }
        .progress-fill.warning { background: linear-gradient(90deg, #ffc107, #fd7e14); }
        .progress-fill.danger { background: linear-gradient(90deg, #dc3545, #e83e8c); }
        .refresh-info { text-align: center; color: #6c757d; font-size: 14px; margin-top: 24px; }
        .error-message { background: #f8d7da; color: #721c24; padding: 16px; border-radius: 4px; margin: 16px 0; }
        .loading { text-align: center; color: #6c757d; padding: 40px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 HealthCare API Monitor</h1>
            <p>Real-time monitoring dashboard for your HealthCare Management API</p>
        </div>

        <div id="loading" class="loading">Loading system metrics...</div>
        <div id="error" class="error-message" style="display: none;"></div>

        <div id="content" style="display: none;">
            <div class="status-grid">
                <!-- API Status Card -->
                <div class="card">
                    <h3>🌐 API Status</h3>
                    <div class="metric">
                        <span class="metric-label">Status:</span>
                        <span id="api-status" class="metric-value">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Response Time:</span>
                        <span id="api-response-time" class="metric-value">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">URL:</span>
                        <span class="metric-value">
                            <a href="https://api.${DOMAIN}" target="_blank" id="api-url">api.${DOMAIN}</a>
                        </span>
                    </div>
                </div>

                <!-- System Metrics Card -->
                <div class="card">
                    <h3>💻 System Metrics</h3>
                    <div class="metric">
                        <span class="metric-label">Memory Usage:</span>
                        <span id="memory-text" class="metric-value">-</span>
                    </div>
                    <div class="progress-bar">
                        <div id="memory-bar" class="progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="metric">
                        <span class="metric-label">CPU Cores:</span>
                        <span id="cpu-cores" class="metric-value">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Load Average:</span>
                        <span id="load-avg" class="metric-value">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Uptime:</span>
                        <span id="uptime" class="metric-value">-</span>
                    </div>
                </div>

                <!-- Container Summary Card -->
                <div class="card">
                    <h3>🐳 Containers</h3>
                    <div class="metric">
                        <span class="metric-label">Total Running:</span>
                        <span id="containers-running" class="metric-value">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">HealthCare API:</span>
                        <span id="api-containers" class="metric-value">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Traefik:</span>
                        <span id="traefik-status" class="metric-value">-</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Monitor:</span>
                        <span id="monitor-status" class="metric-value">-</span>
                    </div>
                </div>
            </div>

            <!-- Container Details Table -->
            <div class="card">
                <h3>🔍 Container Details</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Image</th>
                            <th>State</th>
                            <th>Status</th>
                            <th>Ports</th>
                        </tr>
                    </thead>
                    <tbody id="containers-table">
                        <tr><td colspan="5" style="text-align: center; color: #6c757d;">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="refresh-info">
            🔄 Auto-refreshing every 5 seconds | 
            <a href="http://192.168.1.50:19999" target="_blank">📊 Netdata (Private)</a> | 
            <a href="https://traefik.${DOMAIN}" target="_blank">🔀 Traefik Dashboard</a>
        </div>
    </div>

    <script>
        let refreshInterval;
        
        function formatUptime(seconds) {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            
            if (days > 0) return \`\${days}d \${hours}h \${minutes}m\`;
            if (hours > 0) return \`\${hours}h \${minutes}m\`;
            return \`\${minutes}m\`;
        }
        
        function formatBytes(gb) {
            return \`\${gb} GB\`;
        }
        
        async function refreshMetrics() {
            try {
                const response = await fetch('/api/metrics');
                if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
                
                const data = await response.json();
                
                // Hide loading/error, show content
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'none';
                document.getElementById('content').style.display = 'block';
                
                // Update API status
                const apiStatus = document.getElementById('api-status');
                const apiResponseTime = document.getElementById('api-response-time');
                
                if (data.api.healthy) {
                    apiStatus.textContent = 'Online';
                    apiStatus.className = 'metric-value status-ok';
                    apiResponseTime.textContent = data.api.responseTime ? \`\${data.api.responseTime}ms\` : 'N/A';
                } else {
                    apiStatus.textContent = 'Offline';
                    apiStatus.className = 'metric-value status-error';
                    apiResponseTime.textContent = data.api.error || 'Error';
                }
                
                // Update system metrics
                const system = data.system;
                document.getElementById('memory-text').textContent = 
                    \`\${formatBytes(system.memory.used)} / \${formatBytes(system.memory.total)} (\${system.memory.usagePercent}%)\`;
                
                const memoryBar = document.getElementById('memory-bar');
                memoryBar.style.width = \`\${system.memory.usagePercent}%\`;
                memoryBar.className = 'progress-fill' + 
                    (system.memory.usagePercent > 90 ? ' danger' : 
                     system.memory.usagePercent > 70 ? ' warning' : '');
                
                document.getElementById('cpu-cores').textContent = system.cpu.cores;
                document.getElementById('load-avg').textContent = system.loadAverage.map(l => l.toFixed(2)).join(', ');
                document.getElementById('uptime').textContent = formatUptime(system.uptime);
                
                // Update container summary
                document.getElementById('containers-running').textContent = 
                    \`\${data.containers.running} / \${data.containers.total}\`;
                
                const apiContainers = data.containers.details.filter(c => c.name.includes('healthcare-api'));
                document.getElementById('api-containers').textContent = 
                    \`\${apiContainers.length} running\`;
                document.getElementById('api-containers').className = 
                    'metric-value ' + (apiContainers.length > 0 ? 'status-ok' : 'status-error');
                
                const traefik = data.containers.details.find(c => c.name.includes('traefik'));
                document.getElementById('traefik-status').textContent = traefik ? 'Running' : 'Stopped';
                document.getElementById('traefik-status').className = 
                    'metric-value ' + (traefik ? 'status-ok' : 'status-error');
                
                const monitor = data.containers.details.filter(c => c.name.includes('mon-'));
                document.getElementById('monitor-status').textContent = 
                    \`\${monitor.length} services\`;
                document.getElementById('monitor-status').className = 
                    'metric-value ' + (monitor.length >= 2 ? 'status-ok' : 'status-warning');
                
                // Update container table
                const tbody = document.getElementById('containers-table');
                tbody.innerHTML = data.containers.details.map(container => \`
                    <tr>
                        <td><strong>\${container.name}</strong></td>
                        <td>\${container.image}</td>
                        <td class="container-\${container.state}">\${container.state}</td>
                        <td>\${container.status}</td>
                        <td>\${container.ports}</td>
                    </tr>
                \`).join('');
                
            } catch (error) {
                console.error('Refresh error:', error);
                document.getElementById('loading').style.display = 'none';
                document.getElementById('content').style.display = 'none';
                const errorDiv = document.getElementById('error');
                errorDiv.textContent = \`Failed to load metrics: \${error.message}\`;
                errorDiv.style.display = 'block';
            }
        }
        
        // Initial load and setup refresh
        refreshMetrics();
        refreshInterval = setInterval(refreshMetrics, 5000);
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (refreshInterval) clearInterval(refreshInterval);
        });
    </script>
</body>
</html>
HTML

# Monitor app compose (routes mon.DOMAIN to frontend; /api/* to backend)
cat > ~/healthcare-stack/monitor-app/docker-compose.yml <<YAML
version: '3.8'

services:
  mon-backend:
    build: ./backend
    container_name: healthcare-monitor-backend
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - healthcare-network
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=healthcare-network"
      - "traefik.http.routers.mon-backend.rule=Host(\`mon.${DOMAIN}\`) && PathPrefix(\`/api\`)"
      - "traefik.http.routers.mon-backend.entrypoints=websecure"
      - "traefik.http.routers.mon-backend.tls.certresolver=le"
      - "traefik.http.services.mon-backend.loadbalancer.server.port=8088"
    restart: unless-stopped

  mon-frontend:
    build: ./frontend
    container_name: healthcare-monitor-frontend
    depends_on:
      - mon-backend
    networks:
      - healthcare-network
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=healthcare-network"
      - "traefik.http.routers.mon-frontend.rule=Host(\`mon.${DOMAIN}\`)"
      - "traefik.http.routers.mon-frontend.entrypoints=websecure"
      - "traefik.http.routers.mon-frontend.tls.certresolver=le"
      - "traefik.http.services.mon-frontend.loadbalancer.server.port=80"
      - "traefik.http.routers.mon-frontend.priority=1"
    restart: unless-stopped

networks:
  healthcare-network:
    external: true
YAML

# 6) Create start/stop scripts
log "Creating management scripts..."

cat > ~/healthcare-stack/start.sh <<'SCRIPT'
#!/bin/bash
set -e

echo "🏥 Starting HealthCare API Stack..."

# Create network if it doesn't exist
docker network create healthcare-network 2>/dev/null || true

# Start Traefik first
echo "🔀 Starting Traefik..."
cd ~/healthcare-stack/traefik && docker compose up -d

# Wait for Traefik to be ready
sleep 5

# Start HealthCare API
echo "🏥 Starting HealthCare API..."
cd ~/healthcare-stack/api && docker compose up -d

# Start Monitor App
echo "📊 Starting Monitor Dashboard..."
cd ~/healthcare-stack/monitor-app && docker compose up -d

# Start Netdata
echo "📈 Starting Netdata..."
cd ~/healthcare-stack/monitor && docker compose -f netdata.yml up -d

echo ""
echo "✅ HealthCare API Stack Started!"
echo ""
echo "🌐 Services:"
echo "  - API: https://api.${DOMAIN}"
echo "  - Monitor: https://mon.${DOMAIN}"
echo "  - Traefik: https://traefik.${DOMAIN}"
echo "  - Netdata: http://$(hostname -I | awk '{print $1}'):19999 (private)"
echo ""
echo "📋 Management:"
echo "  - View logs: ~/healthcare-stack/logs.sh"
echo "  - Stop stack: ~/healthcare-stack/stop.sh"
echo "  - Scale API: cd ~/healthcare-stack/api && docker compose up -d --scale healthcare-api=4"
echo ""
SCRIPT

cat > ~/healthcare-stack/stop.sh <<'SCRIPT'
#!/bin/bash
set -e

echo "🛑 Stopping HealthCare API Stack..."

# Stop all services
cd ~/healthcare-stack/monitor && docker compose -f netdata.yml down
cd ~/healthcare-stack/monitor-app && docker compose down
cd ~/healthcare-stack/api && docker compose down
cd ~/healthcare-stack/traefik && docker compose down

echo "✅ HealthCare API Stack Stopped!"
SCRIPT

cat > ~/healthcare-stack/logs.sh <<'SCRIPT'
#!/bin/bash

SERVICE=${1:-all}

case $SERVICE in
  "api"|"healthcare")
    echo "📋 HealthCare API Logs:"
    cd ~/healthcare-stack/api && docker compose logs -f --tail=100
    ;;
  "traefik")
    echo "📋 Traefik Logs:"
    cd ~/healthcare-stack/traefik && docker compose logs -f --tail=100
    ;;
  "monitor")
    echo "📋 Monitor App Logs:"
    cd ~/healthcare-stack/monitor-app && docker compose logs -f --tail=100
    ;;
  "netdata")
    echo "📋 Netdata Logs:"
    cd ~/healthcare-stack/monitor && docker compose -f netdata.yml logs -f --tail=100
    ;;
  "all"|*)
    echo "📋 All Services Logs:"
    echo "Available: api, traefik, monitor, netdata"
    echo "Usage: ./logs.sh [service]"
    echo ""
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    ;;
esac
SCRIPT

cat > ~/healthcare-stack/status.sh <<'SCRIPT'
#!/bin/bash

echo "🏥 HealthCare API Stack Status"
echo "=============================="
echo ""

# Check if network exists
if docker network ls | grep -q healthcare-network; then
    echo "✅ Healthcare network: exists"
else
    echo "❌ Healthcare network: missing"
fi

echo ""
echo "📊 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(traefik|healthcare|monitor|netdata)" || echo "No containers running"

echo ""
echo "🌐 Service Health Checks:"

# Check Traefik
if curl -s --max-time 3 http://localhost:8080/ping > /dev/null 2>&1; then
    echo "✅ Traefik: healthy"
else
    echo "❌ Traefik: unhealthy"
fi

# Check API
if curl -s --max-time 5 https://api.${DOMAIN}/health > /dev/null 2>&1; then
    echo "✅ HealthCare API: healthy"
else
    echo "❌ HealthCare API: unhealthy"
fi

# Check Monitor
if curl -s --max-time 3 https://mon.${DOMAIN}/api/health > /dev/null 2>&1; then
    echo "✅ Monitor Dashboard: healthy"
else
    echo "❌ Monitor Dashboard: unhealthy"
fi

# Check Netdata
if curl -s --max-time 3 http://localhost:19999/api/v1/info > /dev/null 2>&1; then
    echo "✅ Netdata: healthy"
else
    echo "❌ Netdata: unhealthy"
fi

echo ""
echo "📈 Quick Stats:"
echo "  - CPU Load: $(uptime | awk -F'load average:' '{print $2}' | xargs)"
echo "  - Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "  - Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"

SCRIPT

chmod +x ~/healthcare-stack/*.sh

# 7) Copy existing HealthCare API code
log "Setting up HealthCare API source code..."
if [ -d "../healthcare-api" ] || [ -d "../API" ]; then
    # Try to find existing source
    SRC_DIR="../API"
    if [ ! -d "$SRC_DIR" ]; then
        SRC_DIR="../healthcare-api"
    fi
    
    if [ -d "$SRC_DIR" ]; then
        log "Found existing HealthCare API source, copying..."
        cp -r "$SRC_DIR"/* ~/healthcare-stack/api/ 2>/dev/null || true
        cp -r "$SRC_DIR"/.[^.]* ~/healthcare-stack/api/ 2>/dev/null || true
    fi
else
    warning "HealthCare API source not found. You'll need to copy your source code to ~/healthcare-stack/api/"
fi

success "✅ HealthCare API Production Stack Installed!"
echo ""
echo "📋 Next Steps:"
echo "1) Edit MongoDB Atlas URI in ~/healthcare-stack/api/.env"
echo "2) Configure DNS A records for:"
echo "   - api.${DOMAIN} → your public IP"
echo "   - mon.${DOMAIN} → your public IP"
echo "   - traefik.${DOMAIN} → your public IP (optional)"
echo "3) Port-forward ONLY 80/443 to this server's IP"
echo "4) Start the stack:"
echo "   cd ~/healthcare-stack && ./start.sh"
echo ""
echo "🌐 After starting, your services will be at:"
echo "   - API: https://api.${DOMAIN}"
echo "   - Monitor: https://mon.${DOMAIN}"
echo "   - Traefik Dashboard: https://traefik.${DOMAIN}"
echo "   - Netdata: http://$(hostname -I | awk '{print $1}'):19999 (private)"
echo ""
echo "🔧 Management Commands:"
echo "   - Start: ./start.sh"
echo "   - Stop: ./stop.sh"
echo "   - Logs: ./logs.sh [service]"
echo "   - Status: ./status.sh"
echo "   - Scale API: cd api && docker compose up -d --scale healthcare-api=4"
echo ""
warning "⚠️  Remember to:"
warning "   - Change default passwords in ~/healthcare-stack/api/.env"
warning "   - Configure your MongoDB Atlas URI"
warning "   - Set up your API keys (Stripe, Twilio, etc.)"
warning "   - Only port-forward 80/443 on your router"