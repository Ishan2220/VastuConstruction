#!/bin/bash
# Database Backup Script for Vastu Construction ERP
# Run: ./backup.sh

set -e

# Load environment variables
if [ -f ../.env ]; then
  export $(cat ../.env | xargs)
fi

DB_URL=${DATABASE_URL:-"postgresql://postgres:postgres@localhost:5432/vastu_construction"}

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="../backups"
BACKUP_FILE="${BACKUP_DIR}/vastu_backup_${TIMESTAMP}.sql"

echo "=========================================="
echo " Starting Database Backup"
echo "=========================================="

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

echo "Backing up to: ${BACKUP_FILE}"

# Using pg_dump to create a clean SQL backup
# We extract connection string parts for pg_dump
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# This is a simplified regex extraction for bash
DB_USER=$(echo $DB_URL | sed -e 's/.*:\/\/\([^:]*\):.*/\1/')
DB_PASS=$(echo $DB_URL | sed -e 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
DB_HOST=$(echo $DB_URL | sed -e 's/.*@\([^:]*\):.*/\1/')
DB_PORT=$(echo $DB_URL | sed -e 's/.*:\([0-9]*\)\/.*/\1/')
DB_NAME=$(echo $DB_URL | sed -e 's/.*\/\([^?]*\).*/\1/')

export PGPASSWORD=$DB_PASS

echo "Connecting to $DB_HOST:$DB_PORT database $DB_NAME as $DB_USER..."

# Dump the database
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F c -f ${BACKUP_FILE}.dump
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F p -f ${BACKUP_FILE}

if [ $? -eq 0 ]; then
  echo "✅ Backup completed successfully!"
  echo "   File size: $(du -h ${BACKUP_FILE} | cut -f1)"
else
  echo "❌ Backup failed!"
  exit 1
fi

echo "=========================================="
