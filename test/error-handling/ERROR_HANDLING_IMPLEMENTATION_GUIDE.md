# Error Handling and Service Health Monitoring - Implementation Guide

## Overview

This system provides comprehensive error handling and service health monitoring for the EFF Membership Management System. It automatically detects backend connectivity issues, database failures, and cache service problems, providing clear user feedback and automatic recovery.

## Architecture

### Components

1. **Backend Health Endpoint** (`backend/src/routes/health.ts`)
   - `/api/v1/health` - Basic health check
   - `/api/v1/health/detailed` - Comprehensive health check with service status
   - Returns status: `healthy`, `degraded`, or `unhealthy`

2. **Health Monitor Service** (`frontend/src/services/healthMonitorService.ts`)
   - Periodically checks backend health (every 30 seconds)
   - Detects connection issues and service failures
   - Notifies subscribers of status changes

3. **Enhanced API Interceptors** (`frontend/src/services/apiInterceptors.ts`)
   - Intercepts all API requests/responses
   - Implements retry logic with exponential backoff
   - Handles different error types appropriately
   - Updates UI state based on errors

4. **UI Components**
   - `ConnectionStatusBanner` - Prominent banner for critical issues
   - `ConnectionStatusIndicator` - Small indicator in header
   - Integrated with existing notification system

5. **State Management** (`frontend/src/store/index.ts`)
   - Connection status tracking
   - Service health status
   - Error messages
   - Banner visibility control

## Features

### 1. Automatic Error Detection

The system automatically detects:
- **Backend Server Unreachable**: Network errors, timeouts, connection refused
- **Database Connection Failure**: 503 errors with database error codes
- **Cache Service Failure**: Redis unavailable (graceful degradation)
- **HTTP Errors**: 401, 403, 404, 500, 503, etc.

### 2. Retry Logic

- Automatic retry for transient failures (network errors, 5xx errors)
- Exponential backoff: 1s, 2s, 4s (max 30s)
- Maximum 3 retry attempts
- Configurable retry conditions

### 3. User Notifications

**Error Severity Levels**:
- **Critical (Red)**: Backend down, database failure
- **Warning (Yellow)**: Cache unavailable, degraded performance
- **Info (Blue)**: General information

**Notification Types**:
- **Banner**: Persistent, dismissible, with action buttons
- **Toast**: Auto-dismiss after 5 seconds
- **Status Indicator**: Always visible in header

### 4. Recovery Handling

- Automatic detection when services are restored
- Banner auto-dismisses on recovery
- Status indicator updates in real-time
- No manual page refresh required

## Usage

### For Developers

#### Adding Custom Error Handling

```typescript
import { useUIStore } from '../store';

// In your component or service
const store = useUIStore.getState();

// Show error notification
store.addNotification({
  type: 'error',
  message: 'Custom error message'
});

// Update connection status
store.setConnectionStatus('disconnected');
store.setServiceStatus('unhealthy');
store.setShowConnectionBanner(true);
```

#### Checking Current Status

```typescript
import { useUIStore } from '../store';

function MyComponent() {
  const { connectionStatus, serviceStatus } = useUIStore();
  
  if (connectionStatus === 'disconnected') {
    // Handle offline state
  }
  
  if (serviceStatus === 'degraded') {
    // Handle degraded performance
  }
}
```

#### Manual Health Check

```typescript
import { healthMonitorService } from '../services/healthMonitorService';

// Trigger immediate health check
await healthMonitorService.checkNow();

// Get current status
const status = healthMonitorService.getStatus();
```

### For Backend Developers

#### Health Endpoint Response Format

```typescript
{
  success: boolean;
  message: string;
  data: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    response_time: number;
    services: {
      api: {
        status: 'healthy';
        uptime: number;
      };
      database: {
        status: 'healthy' | 'unhealthy';
        details: any;
      };
      cache: {
        status: 'healthy' | 'unhealthy';
        connected: boolean;
        error?: string;
      };
    };
  };
}
```

#### Adding New Service Checks

Edit `backend/src/routes/health.ts`:

```typescript
// Check your service
let myServiceHealth = {
  status: 'healthy' as 'healthy' | 'unhealthy',
  connected: false,
  error: undefined as string | undefined
};

try {
  const isAvailable = await myService.check();
  myServiceHealth = {
    status: isAvailable ? 'healthy' : 'unhealthy',
    connected: isAvailable,
    error: isAvailable ? undefined : 'Service not available'
  };
} catch (error) {
  myServiceHealth = {
    status: 'unhealthy',
    connected: false,
    error: error.message
  };
}

// Add to health data
healthData.services.myService = myServiceHealth;
```

## Configuration

### Health Check Interval

Default: 30 seconds

```typescript
// Change interval (in milliseconds)
healthMonitorService.setCheckInterval(60000); // 60 seconds
```

### Retry Configuration

Edit `frontend/src/services/apiInterceptors.ts`:

```typescript
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  retries: 3,           // Number of retry attempts
  retryDelay: 1000,     // Initial delay in ms
  retryCondition: (error: AxiosError) => {
    // Custom retry logic
    return !error.response || error.response.status >= 500;
  }
};
```

### Timeout Duration

```typescript
// In healthMonitorService.ts
private timeoutDuration: number = 5000; // 5 seconds
```

## Best Practices

1. **Don't Block User Actions**: Show errors but allow users to continue where possible
2. **Provide Clear Messages**: Use user-friendly language, avoid technical jargon
3. **Offer Recovery Options**: Include "Retry" or "Refresh" buttons
4. **Log for Debugging**: Console logs help developers diagnose issues
5. **Test All Scenarios**: Use the test plan to verify all error cases
6. **Monitor Performance**: Health checks shouldn't impact app performance
7. **Graceful Degradation**: Non-critical services (cache) should degrade gracefully

## Troubleshooting

### Health Checks Not Running

- Check browser console for errors
- Verify health monitor service is started
- Check network tab for health check requests

### Banner Not Appearing

- Check `showConnectionBanner` state
- Verify error conditions are met
- Check console for state updates

### Retry Logic Not Working

- Verify error type matches retry conditions
- Check retry count in console logs
- Ensure interceptors are properly configured

### Status Indicator Not Updating

- Check if health monitor is subscribed
- Verify state updates in Redux DevTools
- Check for component re-render issues

## Future Enhancements

- [ ] Add WebSocket for real-time status updates
- [ ] Implement circuit breaker pattern
- [ ] Add metrics and analytics
- [ ] Create admin dashboard for system health
- [ ] Add email/SMS alerts for critical failures
- [ ] Implement service worker for offline support
- [ ] Add predictive failure detection

