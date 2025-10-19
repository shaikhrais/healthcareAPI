#!/bin/bash
# HealthCare API - MongoDB Backup Script
# Automated database backup with compression and retention

set -e

# Configuration
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="healthcare"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Starting MongoDB backup for database: $DB_NAME"

# Backup MongoDB
TEMP_BACKUP_DIR="$BACKUP_DIR/temp_$DATE"
mkdir -p "$TEMP_BACKUP_DIR"

if mongodump --uri="$MONGO_URI" --out="$TEMP_BACKUP_DIR" --gzip; then
    log "MongoDB dump completed successfully"
else
    log "ERROR: MongoDB dump failed"
    rm -rf "$TEMP_BACKUP_DIR"
    exit 1
fi

# Create compressed archive
BACKUP_FILE="$BACKUP_DIR/healthcare_backup_$DATE.tar.gz"
if tar -czf "$BACKUP_FILE" -C "$TEMP_BACKUP_DIR" .; then
    log "Backup compressed successfully: $(basename "$BACKUP_FILE")"
    
    # Get file size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup size: $BACKUP_SIZE"
else
    log "ERROR: Backup compression failed"
    rm -rf "$TEMP_BACKUP_DIR"
    exit 1
fi

# Clean up temporary directory
rm -rf "$TEMP_BACKUP_DIR"

# Optional: Encrypt backup if encryption key is provided
if [ -n "$BACKUP_ENCRYPTION_KEY" ]; then
    log "Encrypting backup..."
    if openssl enc -aes-256-cbc -salt -in "$BACKUP_FILE" -out "$BACKUP_FILE.enc" -k "$BACKUP_ENCRYPTION_KEY"; then
        rm "$BACKUP_FILE"
        mv "$BACKUP_FILE.enc" "$BACKUP_FILE"
        log "Backup encrypted successfully"
    else
        log "WARNING: Backup encryption failed, keeping unencrypted backup"
    fi
fi

# Cleanup old backups
log "Cleaning up backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name "healthcare_backup_*.tar.gz*" -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "healthcare_backup_*.tar.gz*" | wc -l)
log "Backup completed. Total backups retained: $BACKUP_COUNT"

# Verify backup integrity (optional)
if command -v mongorestore >/dev/null 2>&1; then
    log "Verifying backup integrity..."
    TEMP_VERIFY_DIR="$BACKUP_DIR/verify_$DATE"
    mkdir -p "$TEMP_VERIFY_DIR"
    
    if tar -xzf "$BACKUP_FILE" -C "$TEMP_VERIFY_DIR" 2>/dev/null; then
        log "Backup integrity verified successfully"
        rm -rf "$TEMP_VERIFY_DIR"
    else
        log "WARNING: Backup integrity verification failed"
        rm -rf "$TEMP_VERIFY_DIR"
    fi
fi

log "Backup process completed successfully: $(basename "$BACKUP_FILE")"

# Send notification (optional webhook)
if [ -n "$BACKUP_WEBHOOK_URL" ]; then
    curl -X POST "$BACKUP_WEBHOOK_URL" \
         -H "Content-Type: application/json" \
         -d "{\"message\":\"HealthCare API backup completed\",\"file\":\"$(basename "$BACKUP_FILE")\",\"size\":\"$BACKUP_SIZE\",\"timestamp\":\"$(date -Iseconds)\"}" \
         --max-time 10 --silent || log "WARNING: Failed to send backup notification"
fi