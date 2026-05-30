#!/bin/sh
# B-DEVOPS — PostgreSQL backup script
# Corre dentro del contenedor bdev-pgbackup
# Guarda dumps en /backups/, retiene los últimos 7

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILE="$BACKUP_DIR/bdev_ops_$TIMESTAMP.sql.gz"

echo "[backup] $(date) — iniciando pg_dump..."

pg_dump -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" \
  --no-password \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip > "$FILE"

SIZE=$(du -sh "$FILE" | cut -f1)
echo "[backup] $(date) — guardado: $FILE ($SIZE)"

# Eliminar backups con más de 7 días
find "$BACKUP_DIR" -name "bdev_ops_*.sql.gz" -mtime +7 -delete
TOTAL=$(find "$BACKUP_DIR" -name "bdev_ops_*.sql.gz" | wc -l)
echo "[backup] $(date) — backups retenidos: $TOTAL"
