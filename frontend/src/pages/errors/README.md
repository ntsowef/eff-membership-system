# Error Pages System

A comprehensive error handling system for the EFF Membership Management System with professional yet fun error pages.

## 🎯 Features

- **Professional Design**: Clean, modern error pages with consistent branding
- **Fun Elements**: Animated icons, funny messages, and engaging visuals
- **Comprehensive Coverage**: Error pages for all common HTTP status codes
- **Automatic Handling**: API interceptors automatically redirect to appropriate error pages
- **Error Boundaries**: React error boundaries catch JavaScript errors
- **Responsive Design**: Mobile-friendly layouts with Material-UI components
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation

## 📄 Available Error Pages

### 1. **400 - Bad Request** (`/error/bad-request`)
- **When**: Invalid form data, malformed requests
- **Design**: Warning-themed with validation tips
- **Message**: "Your request got lost in translation!"

### 2. **401/403 - Access Denied** (`/error/access-denied`)
- **When**: Authentication/authorization failures
- **Design**: Security-themed with lock animations
- **Message**: "Sorry, this area is more exclusive than a VIP lounge!"

### 3. **404 - Not Found** (`/error/not-found`)
- **When**: Page or resource doesn't exist
- **Design**: Search-themed with floating animations
- **Message**: Random funny messages about missing pages
- **Features**: Helpful suggestions and navigation tips

### 4. **500 - Server Error** (`/error/server-error`)
- **When**: Internal server errors
- **Design**: Technical-themed with glitch effects
- **Message**: "Our server is having a coffee break... a really long one!"
- **Features**: Technical details accordion, automatic refresh suggestions

### 5. **503 - Service Unavailable** (`/error/service-unavailable`)
- **When**: Maintenance or high traffic
- **Design**: Maintenance-themed with countdown timer
- **Message**: "We're giving our servers a well-deserved spa day!"
- **Features**: Auto-refresh countdown, status information

### 6. **Generic Error** (`/error/generic`)
- **When**: Any other error codes
- **Design**: Adaptive colors based on error type
- **Features**: Expandable technical details, error ID generation

## 🛠️ Technical Implementation

### Error Boundary
```typescript
import { ErrorBoundary } from '../pages/errors';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### Error Interceptor
Automatically handles API errors and redirects to appropriate pages:

```typescript
import { setupErrorInterceptor } from '../utils/errorInterceptor';

setupErrorInterceptor({
  enableAutoRedirect: true,
  enableLogging: true,
  excludedStatusCodes: [401], // Don't auto-redirect auth failures
});
```

### Manual Error Navigation
```typescript
import { useErrorHandler } from '../hooks/useErrorHandler';

const { handleError } = useErrorHandler();

try {
  // Your code
} catch (error) {
  handleError(error, 'User Action Context');
}
```

## 🎨 Design System

### Color Scheme
- **400 Errors**: Orange/Warning colors
- **401/403 Errors**: Red/Error colors  
- **404 Errors**: Blue/Info colors
- **500+ Errors**: Red/Error colors

### Animations
- **Pulse Effects**: For attention-grabbing elements
- **Float/Drift**: For subtle movement
- **Glitch Effects**: For technical errors
- **Spin/Rotate**: For loading/processing states

### Typography
- **Error Codes**: Large, gradient text with shadows
- **Messages**: Hierarchical typography with proper contrast
- **Details**: Monospace fonts for technical information

## 🚀 Usage Examples

### 1. Testing Error Pages
Visit `/demo/error-pages` to test all error pages and error handling mechanisms.

### 2. Triggering Errors Programmatically
```typescript
// JavaScript Error (triggers ErrorBoundary)
throw new Error('Test error');

// API Error (triggers interceptor)
fetch('/api/v1/nonexistent-endpoint');

// Manual Navigation
navigate('/error/not-found');
```

### 3. Custom Error Handling
```typescript
import { useErrorHandler } from '../hooks/useErrorHandler';

const { handleApiError } = useErrorHandler({
  showNotification: true,
  redirectOnError: false, // Handle manually
});

const fetchData = async () => {
  try {
    const response = await api.getData();
    return response.data;
  } catch (error) {
    const errorInfo = handleApiError(error);
    // Custom handling based on errorInfo
  }
};
```

## 🔧 Configuration

### Error Interceptor Options
```typescript
interface ErrorInterceptorOptions {
  enableAutoRedirect?: boolean;     // Auto-redirect to error pages
  enableLogging?: boolean;          // Console logging
  excludedRoutes?: string[];        // Routes to skip
  excludedStatusCodes?: number[];   // Status codes to skip
  onError?: (error: AxiosError) => void; // Custom error handler
}
```

### Error Handler Options
```typescript
interface ErrorHandlerOptions {
  showNotification?: boolean;   // Show toast notifications
  redirectOnError?: boolean;    // Auto-redirect to error pages
  logError?: boolean;          // Console logging
}
```

## 📱 Mobile Responsiveness

All error pages are fully responsive with:
- **Flexible Layouts**: Stack buttons vertically on mobile
- **Readable Text**: Appropriate font sizes for all screen sizes
- **Touch-Friendly**: Large buttons with proper spacing
- **Optimized Images**: Scalable icons and animations

## ♿ Accessibility Features

- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Color Contrast**: WCAG AA compliant contrast ratios
- **Focus Management**: Proper focus indicators
- **Semantic HTML**: Proper heading hierarchy and structure

## 🧪 Testing

### Manual Testing
1. Visit `/demo/error-pages` for interactive testing
2. Use browser dev tools to simulate network errors
3. Test with screen readers and keyboard navigation

### Automated Testing
```typescript
// Test error boundary
const ThrowError = () => {
  throw new Error('Test error');
};

render(
  <ErrorBoundary>
    <ThrowError />
  </ErrorBoundary>
);
```

## 🔄 Future Enhancements

- **Error Reporting**: Integration with error tracking services (Sentry, LogRocket)
- **Offline Support**: Special handling for network connectivity issues
- **Internationalization**: Multi-language support for error messages
- **Analytics**: Track error occurrences and user behavior
- **Custom Themes**: Allow customization of error page themes

## 📞 Support

For issues or questions about the error pages system:
1. Check the demo page at `/demo/error-pages`
2. Review browser console for detailed error logs
3. Contact the development team for custom error handling needs

---

*Built with ❤️ for the EFF Membership Management System*
