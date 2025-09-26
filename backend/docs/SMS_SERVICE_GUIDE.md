# SMS Service Configuration Guide

## Overview

The GEOMAPS Membership Management System supports multiple SMS providers to ensure reliable message delivery. The system includes support for HTTP-based providers (Twilio, Clickatell, Generic Gateway) and SMPP (Short Message Peer-to-Peer) protocol for direct carrier connections.

## Supported SMS Providers

### 1. SMPP (Short Message Peer-to-Peer)
**Recommended for high-volume, direct carrier connections**

SMPP is a protocol used by telecommunications industry for exchanging SMS messages between Short Message Service Centers (SMSC) and external short message entities. It provides:

- **Direct carrier connection** for better delivery rates
- **Real-time delivery reports** and status updates
- **High throughput** for bulk messaging
- **Cost-effective** for large volumes
- **Persistent connections** with automatic reconnection

#### SMPP Configuration

Add these environment variables to your `.env` file:

```env
# SMS Provider Selection
SMS_PROVIDER=smpp

# SMPP Configuration
SMPP_HOST=smpp.your-provider.com
SMPP_PORT=2775
SMPP_SYSTEM_ID=your_system_id
SMPP_PASSWORD=your_password
SMPP_SYSTEM_TYPE=your_system_type

# SMPP Address Configuration
SMPP_ADDR_TON=0
SMPP_ADDR_NPI=0
SMPP_ADDRESS_RANGE=

# SMPP Message Configuration
SMPP_SOURCE_ADDR_TON=1
SMPP_SOURCE_ADDR_NPI=1
SMPP_DEST_ADDR_TON=1
SMPP_DEST_ADDR_NPI=1
SMPP_DATA_CODING=0
SMPP_DEFAULT_SENDER=GEOMAPS

# SMPP Options
SMPP_DELIVERY_RECEIPT=true
SMPP_DEBUG=false
SMPP_ENQUIRE_LINK_PERIOD=30000
```

#### SMPP Parameters Explained

- **SMPP_HOST**: SMSC server hostname or IP address
- **SMPP_PORT**: SMSC server port (usually 2775)
- **SMPP_SYSTEM_ID**: Your system identifier provided by the carrier
- **SMPP_PASSWORD**: Authentication password
- **SMPP_SYSTEM_TYPE**: System type identifier (optional)

**Address Configuration:**
- **ADDR_TON**: Type of Number (0=Unknown, 1=International, 2=National, etc.)
- **ADDR_NPI**: Numbering Plan Indicator (0=Unknown, 1=ISDN/E.164, etc.)
- **ADDRESS_RANGE**: Address range for bind operation

**Message Configuration:**
- **DATA_CODING**: Character encoding (0=Default, 8=UCS2, etc.)
- **DEFAULT_SENDER**: Default sender ID for messages
- **DELIVERY_RECEIPT**: Request delivery receipts (true/false)

### 2. Twilio
**Popular cloud-based SMS service**

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

### 3. Clickatell
**Global SMS gateway provider**

```env
SMS_PROVIDER=clickatell
CLICKATELL_API_KEY=your_api_key
```

### 4. Generic SMS Gateway
**For custom HTTP-based SMS gateways**

```env
SMS_PROVIDER=gateway
SMS_GATEWAY_URL=https://api.your-sms-provider.com/send
SMS_GATEWAY_API_KEY=your_api_key
SMS_GATEWAY_USERNAME=your_username  # Optional
SMS_GATEWAY_PASSWORD=your_password  # Optional
```

### 5. Mock Provider
**For development and testing**

```env
SMS_PROVIDER=mock
```

## SMPP Implementation Details

### Connection Management

The SMPP provider implements:

- **Automatic connection establishment** with the SMSC
- **Bind as transceiver** for bidirectional communication
- **Automatic reconnection** on connection failures
- **Enquire link** for connection keep-alive
- **Graceful connection handling** with proper cleanup

### Message Queue

- **Message queuing** when connection is not available
- **Automatic processing** of queued messages on reconnection
- **Timeout handling** for queued messages (30 seconds)
- **Error handling** for failed message submissions

### Delivery Reports

- **Real-time delivery reports** via deliver_sm PDUs
- **Automatic acknowledgment** of delivery reports
- **Status tracking** for sent messages

### Error Handling

- **Connection error recovery** with automatic reconnection
- **Message submission error handling** with detailed error codes
- **Timeout management** for all operations
- **Comprehensive logging** for troubleshooting

## Usage Examples

### Basic SMS Sending

```typescript
import { smsService } from '../services/smsService';

// Send a simple SMS
const result = await smsService.sendSMS(
  '+27123456789',
  'Welcome to GEOMAPS! Your membership application has been approved.'
);

if (result.success) {
  console.log('SMS sent successfully:', result.messageId);
} else {
  console.error('SMS failed:', result.error);
}
```

### Bulk SMS Sending

```typescript
import { smsService } from '../services/smsService';

const recipients = ['+27123456789', '+27987654321', '+27555666777'];
const message = 'Meeting reminder: General meeting tomorrow at 2 PM.';

const results = await Promise.all(
  recipients.map(phone => smsService.sendSMS(phone, message))
);

const successful = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;

console.log(`SMS Summary: ${successful} sent, ${failed} failed`);
```

### Testing SMS Configuration

```typescript
import { smsService } from '../services/smsService';

// Test SMS functionality
const testResult = await smsService.testSMS('+27123456789');

console.log('Provider:', smsService.getProviderName());
console.log('Test result:', testResult);
```

## SMPP Provider Selection Guide

### When to Use SMPP

**Choose SMPP when:**
- Sending high volumes of SMS (>10,000 per month)
- Need direct carrier relationships for better delivery rates
- Require real-time delivery reports
- Cost optimization is important for large volumes
- Need guaranteed message delivery
- Operating in regions with reliable SMPP providers

### SMPP vs HTTP Providers

| Feature | SMPP | HTTP Providers |
|---------|------|----------------|
| **Setup Complexity** | High | Low |
| **Volume Handling** | Excellent | Good |
| **Delivery Reports** | Real-time | Webhook/Polling |
| **Cost (High Volume)** | Lower | Higher |
| **Reliability** | High | Medium-High |
| **Carrier Relationships** | Direct | Aggregated |
| **Technical Requirements** | Advanced | Basic |

## Troubleshooting

### SMPP Connection Issues

1. **Check network connectivity** to SMSC host and port
2. **Verify credentials** (system_id and password)
3. **Check firewall settings** for outbound connections
4. **Review SMSC logs** for bind failures
5. **Validate address configuration** (TON/NPI settings)

### Common SMPP Error Codes

- **0x00000001**: Message Length Error
- **0x00000002**: Command Length Error
- **0x00000003**: Invalid Command ID
- **0x00000004**: Incorrect BIND Status
- **0x00000005**: Already in Bound State
- **0x00000006**: Invalid Priority Flag
- **0x00000007**: Invalid Registered Delivery Flag
- **0x00000008**: System Error

### Message Delivery Issues

1. **Check message format** and encoding
2. **Verify phone number format** (international format)
3. **Review delivery receipts** for failure reasons
4. **Check sender ID** restrictions
5. **Validate message content** for prohibited content

### Performance Optimization

1. **Connection pooling** for multiple SMPP connections
2. **Message batching** for bulk operations
3. **Retry logic** for failed messages
4. **Load balancing** across multiple SMSC connections
5. **Message prioritization** for urgent messages

## Security Considerations

### SMPP Security

- **Secure credentials** storage and rotation
- **Network security** with VPN or private connections
- **Access control** for SMPP system access
- **Audit logging** for all SMPP operations
- **Message content** validation and sanitization

### General SMS Security

- **Phone number validation** to prevent abuse
- **Rate limiting** to prevent spam
- **Content filtering** for prohibited content
- **Opt-out management** for marketing messages
- **Data protection** compliance (GDPR, POPIA)

## Monitoring and Maintenance

### Key Metrics to Monitor

- **Connection uptime** and stability
- **Message delivery rates** by provider
- **Response times** for message submission
- **Error rates** and failure reasons
- **Queue lengths** and processing times

### Regular Maintenance

- **Credential rotation** for security
- **Connection testing** and validation
- **Performance optimization** based on metrics
- **Provider evaluation** and comparison
- **Configuration updates** as needed

## Support and Documentation

For additional support with SMS configuration:

1. **Provider Documentation**: Consult your SMS provider's technical documentation
2. **SMPP Specification**: Refer to SMPP v3.4 specification for protocol details
3. **System Logs**: Check application logs for detailed error information
4. **Network Diagnostics**: Use network tools to diagnose connectivity issues
5. **Provider Support**: Contact your SMS provider's technical support team

## Best Practices

1. **Start with HTTP providers** for initial setup and testing
2. **Migrate to SMPP** when volume and cost justify the complexity
3. **Implement fallback providers** for redundancy
4. **Monitor delivery rates** and switch providers if needed
5. **Test thoroughly** in staging environment before production
6. **Keep credentials secure** and rotate regularly
7. **Implement proper error handling** and retry logic
8. **Monitor costs** and optimize based on usage patterns
