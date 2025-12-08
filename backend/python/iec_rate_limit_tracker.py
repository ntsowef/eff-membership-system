"""
IEC API Rate Limit Tracker (Python)

Tracks IEC API requests to ensure we don't exceed the 10,000 requests per hour limit.
Uses HTTP API to communicate with the Node.js backend's Redis-based rate limiter.
"""

import requests
import logging
from typing import Dict, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Configuration
BACKEND_API_URL = 'http://localhost:5000/api/v1'
IEC_MAX_REQUESTS_PER_HOUR = 10000
IEC_WARNING_THRESHOLD = 9000


class RateLimitExceeded(Exception):
    """Exception raised when IEC API rate limit is exceeded"""
    def __init__(self, message: str, reset_time: int, current_count: int):
        super().__init__(message)
        self.reset_time = reset_time
        self.current_count = current_count


class RateLimitWarning(Exception):
    """Exception raised when approaching IEC API rate limit"""
    def __init__(self, message: str, remaining: int, current_count: int):
        super().__init__(message)
        self.remaining = remaining
        self.current_count = current_count


class IECRateLimitTracker:
    """Tracks IEC API rate limit using backend API"""
    
    def __init__(self, backend_url: str = BACKEND_API_URL):
        self.backend_url = backend_url
        self.rate_limit_endpoint = f'{backend_url}/iec/rate-limit'
    
    def check_and_increment(self) -> Dict:
        """
        Check rate limit and increment counter
        
        Returns:
            Dict with rate limit status
            
        Raises:
            RateLimitExceeded: If rate limit is exceeded
            RateLimitWarning: If approaching rate limit (90%)
        """
        try:
            response = requests.post(
                f'{self.rate_limit_endpoint}/increment',
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                status = data.get('data', {})
                
                # Check if rate limit exceeded
                if status.get('is_limited', False):
                    reset_time = status.get('reset_time', 0)
                    current_count = status.get('current_count', 0)
                    reset_str = self._format_reset_time(reset_time)
                    
                    raise RateLimitExceeded(
                        f"IEC API rate limit exceeded ({current_count}/{IEC_MAX_REQUESTS_PER_HOUR}). "
                        f"Resets in {reset_str}.",
                        reset_time,
                        current_count
                    )
                
                # Check if approaching limit (warning)
                if status.get('is_warning', False):
                    remaining = status.get('remaining', 0)
                    current_count = status.get('current_count', 0)
                    
                    logger.warning(
                        f" Approaching IEC API rate limit: {current_count}/{IEC_MAX_REQUESTS_PER_HOUR} "
                        f"({remaining} remaining)"
                    )
                
                return status
            
            elif response.status_code == 429:
                # Rate limit exceeded
                data = response.json()
                error_data = data.get('error', {})
                reset_time = error_data.get('reset_time', 0)
                current_count = error_data.get('current_count', 0)
                reset_str = self._format_reset_time(reset_time)
                
                raise RateLimitExceeded(
                    f"IEC API rate limit exceeded ({current_count}/{IEC_MAX_REQUESTS_PER_HOUR}). "
                    f"Resets in {reset_str}.",
                    reset_time,
                    current_count
                )
            
            else:
                logger.error(f"Rate limit check failed: {response.status_code}")
                # If backend fails, allow the request (fail open)
                return self._get_default_status()
                
        except (requests.RequestException, requests.Timeout) as e:
            logger.error(f"Error checking rate limit: {e}")
            # If backend is unreachable, allow the request (fail open)
            return self._get_default_status()
    
    def get_status(self) -> Dict:
        """
        Get current rate limit status without incrementing
        
        Returns:
            Dict with rate limit status
        """
        try:
            response = requests.get(
                f'{self.rate_limit_endpoint}/status',
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('data', {})
            else:
                logger.error(f"Failed to get rate limit status: {response.status_code}")
                return self._get_default_status()
                
        except (requests.RequestException, requests.Timeout) as e:
            logger.error(f"Error getting rate limit status: {e}")
            return self._get_default_status()
    
    def _get_default_status(self) -> Dict:
        """Return default status when backend is unavailable"""
        return {
            'current_count': 0,
            'max_limit': IEC_MAX_REQUESTS_PER_HOUR,
            'remaining': IEC_MAX_REQUESTS_PER_HOUR,
            'reset_time': int((datetime.now() + timedelta(hours=1)).timestamp() * 1000),
            'is_limited': False,
            'is_warning': False,
            'percentage_used': 0
        }
    
    def _format_reset_time(self, reset_time_ms: int) -> str:
        """Format reset time as human-readable string"""
        now_ms = int(datetime.now().timestamp() * 1000)
        diff_ms = reset_time_ms - now_ms
        
        if diff_ms <= 0:
            return 'now'
        
        minutes = diff_ms // 60000
        seconds = (diff_ms % 60000) // 1000
        
        if minutes > 0:
            return f"{minutes} minute{'s' if minutes != 1 else ''}"
        return f"{seconds} second{'s' if seconds != 1 else ''}"

