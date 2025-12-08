# Bulk Upload Processor - Python Service

This Python service processes bulk member data uploads with real-time WebSocket progress updates.

## Features

- 📁 Watches for pending file uploads in the database
- 🔄 Processes Excel files using the existing `flexible_membership_ingestionV2.py` processor
- 📡 Sends real-time progress updates via WebSocket
- 💾 Updates database status automatically
- 📝 Logs detailed errors to the database
- ⚙️ Configurable via environment variables

## Installation

### 1. Install Python Dependencies

```bash
cd backend/python
pip install -r requirements.txt
```

### 2. Verify Configuration

The processor reads configuration from the `.env` file in the repository root.

Required environment variables:
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_USER` - Database user (default: eff_admin)
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name (default: eff_membership_database)
- `WEBSOCKET_URL` - WebSocket server URL (default: http://localhost:5000)

### 3. Ensure Upload Directory Exists

The processor watches the `_upload_file_directory` folder in the repository root:

```bash
mkdir -p ../../_upload_file_directory
```

## Running the Processor

### Development Mode

```bash
cd backend/python
python bulk_upload_processor.py
```

### Production Mode (with systemd)

Create a systemd service file `/etc/systemd/system/bulk-upload-processor.service`:

```ini
[Unit]
Description=EFF Bulk Upload Processor
After=network.target postgresql.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/Membership-newV2/backend/python
ExecStart=/usr/bin/python3 bulk_upload_processor.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable bulk-upload-processor
sudo systemctl start bulk-upload-processor
sudo systemctl status bulk-upload-processor
```

View logs:

```bash
sudo journalctl -u bulk-upload-processor -f
```

## How It Works

1. **File Upload**: User uploads Excel file via frontend
2. **Database Record**: Backend creates record in `uploaded_files` table with status='pending'
3. **Processor Detection**: Python processor queries database for pending files
4. **WebSocket Connection**: Processor connects to WebSocket server
5. **File Processing**: Processor calls `flexible_membership_ingestionV2.py` to process file
6. **Progress Updates**: Real-time progress sent via WebSocket to frontend
7. **Status Update**: Database updated with final status (completed/failed)
8. **Error Logging**: Any errors logged to `file_processing_errors` table

## Configuration

### Environment Variables

Create or update `.env` in repository root:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=eff_admin
DB_PASSWORD=Frames!123
DB_NAME=eff_membership_database

# WebSocket
WEBSOCKET_URL=http://localhost:5000

# Processing
PROCESSING_INTERVAL=10  # Seconds between checks
LOG_LEVEL=INFO
```

### Custom Configuration

Edit `backend/python/config.py` to customize default values.

## Troubleshooting

### Database Connection Error

```
ERROR - Error getting pending files: connection to server at "localhost" failed
```

**Solution**: Check database credentials in `.env` file and ensure PostgreSQL is running.

### WebSocket Connection Error

```
ERROR - Failed to connect to WebSocket server
```

**Solution**: Ensure backend server is running on the configured port (default: 5000).

### File Not Found Error

```
ERROR - File not found: /path/to/file.xlsx
```

**Solution**: Ensure the `_upload_file_directory` exists and files are being uploaded to the correct location.

### Import Error

```
ModuleNotFoundError: No module named 'flexible_membership_ingestionV2'
```

**Solution**: Ensure `flexible_membership_ingestionV2.py` is in the repository root directory.

## Monitoring

### Check Processor Status

```bash
# View recent logs
tail -f /var/log/bulk-upload-processor.log

# Check database for pending files
psql -U eff_admin -d eff_membership_database -c "SELECT * FROM uploaded_files WHERE status='pending';"

# Check processing errors
psql -U eff_admin -d eff_membership_database -c "SELECT * FROM file_processing_errors ORDER BY error_timestamp DESC LIMIT 10;"
```

## Architecture

```
┌─────────────┐
│   Frontend  │
│  (React)    │
└──────┬──────┘
       │ Upload File
       ▼
┌─────────────┐
│   Backend   │
│  (Node.js)  │◄──────┐
└──────┬──────┘       │
       │              │ WebSocket
       │ Create       │ Progress
       │ Record       │ Updates
       ▼              │
┌─────────────┐       │
│  PostgreSQL │       │
│  Database   │       │
└──────┬──────┘       │
       │              │
       │ Query        │
       │ Pending      │
       ▼              │
┌─────────────┐       │
│   Python    │───────┘
│  Processor  │
└─────────────┘
```

## Files

- `bulk_upload_processor.py` - Main processor script
- `websocket_client.py` - WebSocket client for Python
- `config.py` - Configuration loader
- `requirements.txt` - Python dependencies
- `README.md` - This file

