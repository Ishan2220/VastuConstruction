@echo off
echo Starting Restore for Vastu Construction ERP (Staging)...

if "%1"=="" (
    echo Usage: restore.bat ^<backup_file_path^>
    exit /b 1
)

set PGPASSWORD=postgres
set DB_NAME=vastu_staging
set BACKUP_FILE=%1

echo Warning: This will drop the existing %DB_NAME% database schema and restore from %BACKUP_FILE%.
pause

pg_restore -U postgres -d %DB_NAME% -c --if-exists %BACKUP_FILE%

if %ERRORLEVEL% equ 0 (
    echo Restore completed successfully.
) else (
    echo Restore failed!
)
