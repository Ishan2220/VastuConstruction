@echo off
echo Starting Backup for Vastu Construction ERP (Staging)...

set PGPASSWORD=postgres
set DB_NAME=vastu_staging
set BACKUP_FILE=vastu_staging_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.dump

pg_dump -U postgres -d %DB_NAME% -F c -f %BACKUP_FILE%

if %ERRORLEVEL% equ 0 (
    echo Backup completed successfully: %BACKUP_FILE%
) else (
    echo Backup failed!
)
