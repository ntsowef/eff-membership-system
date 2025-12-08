"""
WebSocket notification helper for Python scripts.
Sends notifications to the backend WebSocket service via HTTP API.
"""
import requests
import json
from typing import Dict, Any, Optional


class WebSocketNotifier:
    """Helper class to send WebSocket notifications from Python scripts."""
    
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api/v1/internal/websocket"
    
    def send_bulk_upload_progress(
        self,
        file_id: int,
        status: str,
        progress: int,
        rows_processed: int,
        rows_total: int,
        message: Optional[str] = None
    ) -> bool:
        """
        Send bulk upload progress notification.
        
        Args:
            file_id: The file ID being processed
            status: Current status (processing, completed, failed)
            progress: Progress percentage (0-100)
            rows_processed: Number of rows processed so far
            rows_total: Total number of rows
            message: Optional message
            
        Returns:
            True if notification sent successfully, False otherwise
        """
        try:
            payload = {
                "event": "bulk_upload_progress",
                "file_id": file_id,
                "data": {
                    "status": status,
                    "progress": progress,
                    "rows_processed": rows_processed,
                    "rows_total": rows_total,
                }
            }
            
            if message:
                payload["data"]["message"] = message
            
            response = requests.post(
                f"{self.api_url}/notify",
                json=payload,
                timeout=5
            )
            
            return response.status_code == 200
        except Exception as e:
            print(f"⚠️ Failed to send WebSocket notification: {e}")
            return False
    
    def send_bulk_upload_complete(
        self,
        file_id: int,
        rows_success: int,
        rows_failed: int,
        rows_total: int,
        errors: Optional[list] = None
    ) -> bool:
        """
        Send bulk upload completion notification.
        
        Args:
            file_id: The file ID that was processed
            rows_success: Number of successfully processed rows
            rows_failed: Number of failed rows
            rows_total: Total number of rows
            errors: Optional list of error details
            
        Returns:
            True if notification sent successfully, False otherwise
        """
        try:
            payload = {
                "event": "bulk_upload_complete",
                "file_id": file_id,
                "data": {
                    "rows_success": rows_success,
                    "rows_failed": rows_failed,
                    "rows_total": rows_total,
                }
            }
            
            if errors:
                payload["data"]["errors"] = errors
            
            response = requests.post(
                f"{self.api_url}/notify",
                json=payload,
                timeout=5
            )
            
            return response.status_code == 200
        except Exception as e:
            print(f"⚠️ Failed to send WebSocket notification: {e}")
            return False
    
    def send_rate_limit_warning(
        self,
        file_id: int,
        current_count: int,
        max_limit: int,
        remaining: int,
        percentage_used: float
    ) -> bool:
        """
        Send IEC API rate limit warning notification.

        Args:
            file_id: The file ID being processed
            current_count: Current number of requests made
            max_limit: Maximum requests allowed per hour
            remaining: Remaining requests before limit
            percentage_used: Percentage of limit used

        Returns:
            True if notification sent successfully, False otherwise
        """
        try:
            payload = {
                "event": "iec_rate_limit_warning",
                "file_id": file_id,
                "data": {
                    "current_count": current_count,
                    "max_limit": max_limit,
                    "remaining": remaining,
                    "percentage_used": percentage_used
                }
            }

            response = requests.post(
                f"{self.api_url}/notify",
                json=payload,
                timeout=5
            )

            return response.status_code == 200
        except Exception as e:
            print(f"⚠️ Failed to send rate limit warning: {e}")
            return False

    def send_rate_limit_exceeded(
        self,
        file_id: int,
        current_count: int,
        max_limit: int,
        reset_time: int,
        rows_processed: int,
        rows_total: int,
        message: str
    ) -> bool:
        """
        Send IEC API rate limit exceeded notification.

        Args:
            file_id: The file ID being processed
            current_count: Current number of requests made
            max_limit: Maximum requests allowed per hour
            reset_time: Unix timestamp when limit resets (milliseconds)
            rows_processed: Number of rows processed before limit
            rows_total: Total rows in upload
            message: Human-readable message

        Returns:
            True if notification sent successfully, False otherwise
        """
        try:
            payload = {
                "event": "iec_rate_limit_exceeded",
                "file_id": file_id,
                "data": {
                    "current_count": current_count,
                    "max_limit": max_limit,
                    "reset_time": reset_time,
                    "rows_processed": rows_processed,
                    "rows_total": rows_total,
                    "message": message
                }
            }

            response = requests.post(
                f"{self.api_url}/notify",
                json=payload,
                timeout=5
            )

            return response.status_code == 200
        except Exception as e:
            print(f"⚠️ Failed to send rate limit exceeded notification: {e}")
            return False

    def send_bulk_upload_error(
        self,
        file_id: int,
        error: str
    ) -> bool:
        """
        Send bulk upload error notification.

        Args:
            file_id: The file ID that failed
            error: Error message
            
        Returns:
            True if notification sent successfully, False otherwise
        """
        try:
            payload = {
                "event": "bulk_upload_error",
                "file_id": file_id,
                "data": {
                    "error": error
                }
            }
            
            response = requests.post(
                f"{self.api_url}/notify",
                json=payload,
                timeout=5
            )
            
            return response.status_code == 200
        except Exception as e:
            print(f"⚠️ Failed to send WebSocket notification: {e}")
            return False

