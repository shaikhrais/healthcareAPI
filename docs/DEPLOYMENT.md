# Deployment Guide

This guide covers deploying the HealthCare API in various environments.

## 🚀 Quick Production Deployment

### One-Shot Installation (Recommended)

For Ubuntu Server with domain name:

```bash
# Download and run the installer
wget https://raw.githubusercontent.com/yourusername/healthcareAPI/main/deployment/install_healthcare_stack.sh
chmod +x install_healthcare_stack.sh
./install_healthcare_stack.sh yourdomain.com your-email@domain.com
```

This installs:
- Docker and Docker Compose
- Traefik v3.0 reverse proxy
- HealthCare API container
- MongoDB (or connects to Atlas)
- Netdata monitoring
- Custom monitoring dashboard
- Automatic HTTPS with Let's Encrypt

## 🔧 Manual Deployment

### Prerequisites

- Ubuntu Server 22.04 LTS (recommended)
- Docker and Docker Compose
- Domain name with DNS configured
- Ports 80 and 443 open

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y
```

### Step 2: Clone Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/healthcareAPI.git
cd healthcareAPI
```

### Step 3: Configure Environment

```bash
# Copy production environment template
cp .env.production.template .env.production

# Edit configuration
nano .env.production
```

Required environment variables:
```env
# Domain Configuration
DOMAIN=yourdomain.com
ACME_EMAIL=your-email@domain.com

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/healthcare

# Security
JWT_SECRET=your-super-secure-jwt-secret-256-bits
SESSION_SECRET=your-session-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Step 4: Start Production Stack

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

## 🌐 Domain Configuration

### DNS Records

Configure these DNS records for your domain:

```
Type    Name                Value
A       @                   YOUR_SERVER_IP
A       www                 YOUR_SERVER_IP
A       api                 YOUR_SERVER_IP
A       monitor             YOUR_SERVER_IP
A       netdata             YOUR_SERVER_IP
```

### Subdomains

The deployment creates these endpoints:
- `https://yourdomain.com` - Main API
- `https://api.yourdomain.com` - API endpoints
- `https://monitor.yourdomain.com` - Custom monitoring
- `https://netdata.yourdomain.com` - System monitoring

## 🗄️ Database Options

### Option 1: MongoDB Atlas (Recommended)

1. Create MongoDB Atlas cluster
2. Get connection string
3. Set `MONGODB_URI` in environment

### Option 2: Local MongoDB

```bash
# Add to docker-compose.production.yml
services:
  mongodb:
    image: mongo:7
    container_name: healthcare-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: your-secure-password
    volumes:
      - mongodb_data:/data/db
    networks:
      - healthcare-network
```

## 📊 Monitoring Setup

### Custom Monitor Dashboard

Access at `https://monitor.yourdomain.com`:
- API health and response times
- Request counts and error rates
- Database connection status
- Container health and resources

### Netdata System Monitoring

Access at `https://netdata.yourdomain.com`:
- CPU, memory, disk usage
- Network statistics
- Docker container metrics
- System performance alerts

### Log Management

```bash
# View application logs
docker-compose logs -f healthcare-api

# View Traefik logs
docker-compose logs -f traefik

# View all logs
docker-compose logs -f
```

## 🔒 Security Configuration

### SSL/TLS

Automatic HTTPS is provided by Traefik + Let's Encrypt:
- Certificates auto-renew
- HTTP to HTTPS redirects
- Security headers included

### Firewall

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
```

### Rate Limiting

Configured in `docker-compose.production.yml`:
- 100 requests per minute per IP
- Burst handling for traffic spikes
- IP whitelisting for admin access

## 🚀 Performance Optimization

### Scaling

```bash
# Scale API containers
docker-compose -f docker-compose.production.yml up -d --scale healthcare-api=3

# Update load balancer
docker-compose -f docker-compose.production.yml restart traefik
```

### Resource Limits

Configure in `docker-compose.production.yml`:
```yaml
services:
  healthcare-api:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## 🔄 Updates and Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d
```

### Backup

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/healthcare_$DATE"

# Backup database
docker exec healthcare-mongodb mongodump --out $BACKUP_DIR/mongodb

# Backup application data
docker run --rm -v healthcare_data:/data -v $BACKUP_DIR:/backup busybox tar czf /backup/app_data.tar.gz /data

# Cleanup old backups (keep 7 days)
find /backup -name "healthcare_*" -mtime +7 -exec rm -rf {} +
EOF

chmod +x backup.sh

# Add to crontab for daily backups
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

## 🐳 Development Environment

### Local Development with Docker

```bash
# Start development stack
docker-compose up -d

# API available at http://localhost:3001
# MongoDB at localhost:27017
```

### Local Development without Docker

```bash
# Install dependencies
npm install

# Start MongoDB locally
sudo systemctl start mongod

# Start development server
npm run dev
```

## 🧪 Testing Deployment

### Health Checks

```bash
# Test API health
curl https://yourdomain.com/health

# Test specific endpoints
curl https://yourdomain.com/api/status
curl https://yourdomain.com/api-docs
```

### Load Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test API performance
ab -n 1000 -c 10 https://yourdomain.com/api/status
```

## 🔧 Troubleshooting

### Common Issues

**Container not starting:**
```bash
# Check logs
docker-compose logs container-name

# Check resources
docker stats
```

**SSL certificate issues:**
```bash
# Check Traefik logs
docker-compose logs traefik

# Verify DNS
nslookup yourdomain.com
```

**Database connection issues:**
```bash
# Test MongoDB connection
docker exec -it healthcare-api node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
"
```

### Performance Issues

**High CPU usage:**
- Check container resource limits
- Scale API containers
- Optimize database queries

**High memory usage:**
- Monitor with Netdata
- Check for memory leaks
- Adjust container limits

## 📞 Support

For deployment issues:
- Check the [troubleshooting guide](TROUBLESHOOTING.md)
- Review logs and monitoring dashboards
- Create GitHub issue with deployment details

---

**🏥 Ready for production healthcare management! 🚀**