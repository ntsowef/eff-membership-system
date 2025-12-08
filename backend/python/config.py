"""
Configuration for Python bulk upload processor
Reads from environment variables or uses defaults
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from repository root
repo_root = Path(__file__).parent.parent.parent
env_path = repo_root / '.env'

if env_path.exists():
    load_dotenv(env_path)
    print(f'✅ Loaded environment from: {env_path}')
else:
    print(f'⚠️  .env file not found at: {env_path}')

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'user': os.getenv('DB_USER', 'eff_admin'),
    'password': os.getenv('DB_PASSWORD', 'Frames!123'),
    'database': os.getenv('DB_NAME', 'eff_membership_database')
}

# WebSocket configuration
WEBSOCKET_URL = os.getenv('WEBSOCKET_URL', 'http://localhost:5000')
INTERNAL_SERVICE_API_KEY = os.getenv('INTERNAL_SERVICE_API_KEY', 'eff-internal-service-key-2024')

# Upload directory
# Always use absolute path from repository root
upload_dir_env = os.getenv('UPLOAD_DIR', '_upload_file_directory')
# If it's a relative path, make it absolute from repo root
if not os.path.isabs(upload_dir_env):
    UPLOAD_DIR = str(repo_root / upload_dir_env)
else:
    UPLOAD_DIR = upload_dir_env

# Processing interval (seconds)
PROCESSING_INTERVAL = int(os.getenv('PROCESSING_INTERVAL', '10'))

# IEC Verification configuration
IEC_VERIFICATION_ENABLED = os.getenv('IEC_VERIFICATION_ENABLED', 'true').lower() in ('true', '1', 'yes')
IEC_VERIFICATION_MAX_WORKERS = int(os.getenv('IEC_VERIFICATION_MAX_WORKERS', '15'))

# Logging configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

print(' Configuration loaded:')
print(f'   Database: {DB_CONFIG["user"]}@{DB_CONFIG["host"]}:{DB_CONFIG["port"]}/{DB_CONFIG["database"]}')
print(f'   WebSocket: {WEBSOCKET_URL}')
print(f'   Upload Dir: {UPLOAD_DIR}')
print(f'   Interval: {PROCESSING_INTERVAL}s')
print(f'   IEC Verification: {"Enabled" if IEC_VERIFICATION_ENABLED else "Disabled"}')

