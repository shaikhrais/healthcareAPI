# HealthCare API Quick Deployment Commands

## Prerequisites Setup

```bash
# 1. Create Traefik network
docker network create traefik-proxy

# 2. Set up Traefik directory
mkdir -p ~/traefik
cd ~/traefik

# Create acme.json for certificates
touch acme.json
chmod 600 acme.json

# 3. Start Traefik (copy traefik.yml and docker-compose.yml to ~/traefik)
docker compose up -d
```

## Application Deployment

```bash
# 1. Clone/upload your application
cd ~
git clone https://github.com/yourusername/healthcare-api.git
cd healthcare-api

# 2. Configure environment
cp deployment/.env.production.template deployment/.env.production
nano deployment/.env.production  # Edit with your actual values

# 3. Make scripts executable
chmod +x deployment/scripts/*.sh

# 4. Deploy application
cd deployment
docker compose -f docker-compose.production.yml up -d
```

## Quick Commands

```bash
# Check all services
docker ps

# View API logs
docker logs healthcare-api-prod -f

# View all logs
docker compose -f docker-compose.production.yml logs -f

# Restart API
docker restart healthcare-api-prod

# Run backup
docker compose -f docker-compose.production.yml --profile backup run --rm mongodb-backup

# Update and redeploy
./scripts/deploy.sh

# Health check
curl https://api.yourdomain.com/health

# Check certificates
curl -I https://api.yourdomain.com/health
```

## Monitoring

```bash
# System resources
htop

# Disk usage
df -h

# Docker stats
docker stats

# Check Traefik
curl http://localhost:8080/api/rawdata
```

## Troubleshooting

```bash
# Check Traefik logs
docker logs traefik

# Check network connectivity
docker network inspect traefik-proxy

# Test internal connectivity
docker exec healthcare-api-prod curl http://localhost:3001/health

# Check DNS resolution
nslookup api.yourdomain.com

# Check Let's Encrypt certificates
docker exec traefik cat /acme.json | jq .
```