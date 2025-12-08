"""
WebSocket Client for Python File Processor
Sends real-time progress updates to the Node.js backend
"""

import socketio
import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class FileProcessingWebSocketClient:
    """WebSocket client for sending file processing progress updates"""

    def __init__(self, server_url: str = 'http://localhost:5000', auth_token: Optional[str] = None, api_key: Optional[str] = None):
        """
        Initialize WebSocket client

        Args:
            server_url: URL of the Socket.IO server
            auth_token: Optional JWT token for authentication (for user connections)
            api_key: Optional API key for service-to-service authentication (for Python processor)
        """
        self.server_url = server_url
        self.auth_token = auth_token
        self.api_key = api_key
        self.sio = socketio.Client(logger=False, engineio_logger=False)
        self.connected = False
        self.file_id: Optional[int] = None

        # Register event handlers
        self._register_handlers()
    
    def _register_handlers(self):
        """Register Socket.IO event handlers"""
        
        @self.sio.on('connect')
        def on_connect():
            self.connected = True
            logger.info('✅ Connected to WebSocket server')
        
        @self.sio.on('disconnect')
        def on_disconnect():
            self.connected = False
            logger.info('🔌 Disconnected from WebSocket server')
        
        @self.sio.on('connect_error')
        def on_connect_error(data):
            logger.error(f'❌ Connection error: {data}')
    
    def connect(self) -> bool:
        """
        Connect to WebSocket server

        Returns:
            bool: True if connected successfully
        """
        try:
            auth_data = {}
            if self.api_key:
                # Service-to-service authentication with API key
                auth_data['apiKey'] = self.api_key
                logger.info(f'🔑 Connecting with API key authentication')
            elif self.auth_token:
                # User authentication with JWT token
                auth_data['token'] = self.auth_token
                logger.info(f'🔑 Connecting with JWT token authentication')
            else:
                logger.warning('⚠️  No authentication credentials provided')

            self.sio.connect(
                self.server_url,
                auth=auth_data,
                transports=['websocket', 'polling'],
                wait_timeout=10
            )
            
            # Wait for connection
            timeout = 5
            start_time = time.time()
            while not self.connected and (time.time() - start_time) < timeout:
                time.sleep(0.1)
            
            return self.connected
        except Exception as e:
            logger.error(f'Failed to connect to WebSocket server: {e}')
            return False
    
    def disconnect(self):
        """Disconnect from WebSocket server"""
        try:
            if self.connected:
                self.sio.disconnect()
                logger.info('Disconnected from WebSocket server')
        except Exception as e:
            logger.error(f'Error disconnecting: {e}')
    
    def set_file_id(self, file_id: int):
        """Set the current file ID being processed"""
        self.file_id = file_id
    
    def send_progress(self, 
                     status: str,
                     progress: int,
                     rows_processed: int,
                     rows_total: int,
                     message: Optional[str] = None):
        """
        Send progress update
        
        Args:
            status: Current status (processing, completed, failed)
            progress: Progress percentage (0-100)
            rows_processed: Number of rows processed
            rows_total: Total number of rows
            message: Optional status message
        """
        if not self.connected or not self.file_id:
            return
        
        try:
            data = {
                'file_id': self.file_id,
                'status': status,
                'progress': progress,
                'rows_processed': rows_processed,
                'rows_total': rows_total
            }
            
            if message:
                data['message'] = message
            
            self.sio.emit('bulk_upload_progress', data)
            logger.debug(f'📊 Progress: {progress}% ({rows_processed}/{rows_total})')
        except Exception as e:
            logger.error(f'Error sending progress: {e}')
    
    def send_complete(self,
                     rows_success: int,
                     rows_failed: int,
                     rows_total: int,
                     errors: Optional[list] = None,
                     validation_stats: Optional[dict] = None):
        """
        Send completion notification

        Args:
            rows_success: Number of successfully processed rows
            rows_failed: Number of failed rows
            rows_total: Total number of rows
            errors: Optional list of error details
            validation_stats: Optional pre-validation statistics
        """
        if not self.connected or not self.file_id:
            return

        try:
            data = {
                'file_id': self.file_id,
                'rows_success': rows_success,
                'rows_failed': rows_failed,
                'rows_total': rows_total
            }

            if errors:
                data['errors'] = errors

            if validation_stats:
                data['validation_stats'] = validation_stats

            self.sio.emit('bulk_upload_complete', data)
            logger.info(f'✅ Processing complete: {rows_success} success, {rows_failed} failed')
        except Exception as e:
            logger.error(f'Error sending completion: {e}')

    def send_error(self, error_message: str):
        """
        Send error notification

        Args:
            error_message: Error message to send
        """
        if not self.connected or not self.file_id:
            return

        try:
            data = {
                'file_id': self.file_id,
                'error': error_message
            }

            self.sio.emit('bulk_upload_error', data)
            logger.error(f'❌ Processing error: {error_message}')
        except Exception as e:
            logger.error(f'Error sending error notification: {e}')

    def send_uploaded_rows(self, rows: list):
        """
        Send all uploaded rows to frontend for display

        Args:
            rows: List of row dictionaries from the uploaded spreadsheet
        """
        if not self.connected or not self.file_id:
            return

        try:
            # Convert any NaN or None values to empty strings for JSON serialization
            import math
            cleaned_rows = []
            for row in rows:
                cleaned_row = {}
                for key, value in row.items():
                    if value is None or (isinstance(value, float) and math.isnan(value)):
                        cleaned_row[key] = ''
                    else:
                        cleaned_row[key] = value
                cleaned_rows.append(cleaned_row)

            data = {
                'file_id': self.file_id,
                'rows': cleaned_rows,
                'total_rows': len(cleaned_rows)
            }

            self.sio.emit('bulk_upload_rows', data)
            logger.info(f'📤 Sent {len(cleaned_rows)} uploaded rows to frontend')
        except Exception as e:
            logger.error(f'Error sending uploaded rows: {e}')

    def __enter__(self):
        """Context manager entry"""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.disconnect()

