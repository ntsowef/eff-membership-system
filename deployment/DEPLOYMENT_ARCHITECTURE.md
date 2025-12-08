# Backend API Deployment Architecture

Visual guide to understand how the deployment works.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
│                                                                   │
│  Users/Clients → https://api.effmemberportal.org                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS (443)
                             │ HTTP (80) → Redirect to HTTPS
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      YOUR SERVER                                 │
│                   (Ubuntu 20.04/22.04)                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    NGINX                                  │   │
│  │              (Reverse Proxy)                             │   │
│  │                                                           │   │
│  │  • SSL/TLS Termination                                   │   │
│  │  • Let's Encrypt Certificate                             │   │
│  │  • Security Headers                                      │   │
│  │  • Rate Limiting                                         │   │
│  │  • Gzip Compression                                      │   │
│  │  • WebSocket Support                                     │   │
│  │  • CORS Configuration                                    │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         │ HTTP (localhost:5000)                 │
│                         │                                        │
│  ┌──────────────────────▼─────────────────────────────────┐   │
│  │              NODE.JS BACKEND                            │   │
│  │           (Express.js API Server)                       │   │
│  │                                                          │   │
│  │  • REST API Endpoints                                   │   │
│  │  • Business Logic                                       │   │
│  │  • Authentication                                       │   │
│  │  • Database Queries                                     │   │
│  │  • File Processing                                      │   │
│  │  • WebSocket Server                                     │   │
│  │                                                          │   │
│  │  Managed by: PM2                                        │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │                                        │
│                         │                                        │
│  ┌──────────────────────▼─────────────────────────────────┐   │
│  │              POSTGRESQL DATABASE                        │   │
│  │                (Docker Container)                       │   │
│  │                                                          │   │
│  │  • Member Data                                          │   │
│  │  • User Accounts                                        │   │
│  │  • Leadership Records                                   │   │
│  │  • Geographic Data                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                REDIS CACHE                               │   │
│  │             (Docker Container)                           │   │
│  │                                                          │   │
│  │  • Session Storage                                      │   │
│  │  • API Response Cache                                   │   │
│  │  • Rate Limiting Data                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow

### HTTPS Request Flow

```
1. Client Request
   ↓
   https://api.effmemberportal.org/api/v1/members
   ↓
2. DNS Resolution
   ↓
   api.effmemberportal.org → YOUR_SERVER_IP
   ↓
3. Nginx (Port 443)
   ↓
   • SSL/TLS Handshake
   • Certificate Validation
   • Security Headers
   • Rate Limiting Check
   ↓
4. Reverse Proxy
   ↓
   http://localhost:5000/api/v1/members
   ↓
5. Node.js Backend
   ↓
   • Authentication Check
   • Authorization Check
   • Business Logic
   • Database Query
   ↓
6. PostgreSQL Database
   ↓
   • Execute Query
   • Return Results
   ↓
7. Backend Response
   ↓
   JSON Response
   ↓
8. Nginx
   ↓
   • Gzip Compression
   • Security Headers
   • SSL Encryption
   ↓
9. Client Receives Response
   ↓
   Encrypted HTTPS Response
```

---

## 🔐 SSL/TLS Flow

### Certificate Issuance

```
1. Certbot Request
   ↓
   sudo certbot --nginx -d api.effmemberportal.org
   ↓
2. ACME Challenge
   ↓
   Let's Encrypt → http://api.effmemberportal.org/.well-known/acme-challenge/
   ↓
3. Domain Verification
   ↓
   Nginx serves challenge file
   ↓
4. Certificate Issuance
   ↓
   Let's Encrypt issues certificate
   ↓
5. Nginx Configuration
   ↓
   Certbot updates Nginx config with SSL paths
   ↓
6. SSL Active
   ↓
   https://api.effmemberportal.org (HTTPS enabled)
```

### Certificate Renewal

```
Automatic Renewal (Every 12 hours check)
   ↓
   Certbot Timer (systemd)
   ↓
   Check certificate expiration
   ↓
   If < 30 days remaining
   ↓
   Renew certificate
   ↓
   Reload Nginx
   ↓
   Certificate updated (no downtime)
```

---

## 📁 File Structure

```
/opt/eff-membership/
├── backend/
│   ├── dist/                    # Compiled TypeScript
│   │   └── app.js              # Main application
│   ├── src/                     # Source code
│   ├── .env                     # Environment variables
│   └── package.json
│
├── deployment/
│   ├── nginx-backend-api.conf           # Nginx config
│   ├── setup-backend-api-ssl.sh         # Setup script
│   ├── BACKEND_API_SSL_DEPLOYMENT.md    # Full guide
│   ├── QUICK_START_API_DEPLOYMENT.md    # Quick start
│   └── NGINX_INSTALLATION_UBUNTU.md     # Nginx guide
│
├── logs/
│   └── nginx/
│       ├── access.log
│       └── error.log
│
└── ssl-certs/                   # SSL certificates (if self-signed)

/etc/nginx/
├── nginx.conf                   # Main Nginx config
├── sites-available/
│   └── eff-api                 # Your API config
└── sites-enabled/
    └── eff-api → ../sites-available/eff-api

/etc/letsencrypt/
├── live/
│   └── api.effmemberportal.org/
│       ├── fullchain.pem       # SSL certificate
│       ├── privkey.pem         # Private key
│       └── chain.pem           # Certificate chain
└── renewal/
    └── api.effmemberportal.org.conf

/var/log/nginx/
├── api.effmemberportal.org-access.log
└── api.effmemberportal.org-error.log
```

---

## 🔌 Port Configuration

```
┌──────────────────────────────────────────────────────────┐
│                    FIREWALL (UFW)                         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Port 80 (HTTP)    → Open → Nginx → Redirect to HTTPS   │
│  Port 443 (HTTPS)  → Open → Nginx → Backend             │
│  Port 22 (SSH)     → Open → SSH Access                  │
│  Port 5000         → Closed (Internal only)              │
│  Port 5432         → Closed (Internal only)              │
│  Port 6379         → Closed (Internal only)              │
│                                                           │
└──────────────────────────────────────────────────────────┘

External Access:
  ✅ Port 80  (HTTP)  - Redirects to HTTPS
  ✅ Port 443 (HTTPS) - API Access
  ✅ Port 22  (SSH)   - Server Management

Internal Only:
  🔒 Port 5000 - Node.js Backend
  🔒 Port 5432 - PostgreSQL
  🔒 Port 6379 - Redis
```

---

## 🛡️ Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                       │
└─────────────────────────────────────────────────────────┘

Layer 1: Network
  • Firewall (UFW)
  • Port restrictions
  • IP filtering (optional)

Layer 2: SSL/TLS
  • HTTPS encryption
  • TLS 1.2/1.3 only
  • Strong cipher suites
  • HSTS enabled

Layer 3: Nginx
  • Rate limiting
  • Request size limits
  • Security headers
  • CORS configuration

Layer 4: Application
  • JWT authentication
  • Role-based access control
  • Input validation
  • SQL injection prevention

Layer 5: Database
  • Connection pooling
  • Prepared statements
  • User permissions
  • Encrypted connections
```

---

## 📊 Performance Optimizations

```
┌─────────────────────────────────────────────────────────┐
│              PERFORMANCE FEATURES                        │
└─────────────────────────────────────────────────────────┘

Nginx Level:
  ✅ HTTP/2 support
  ✅ Gzip compression
  ✅ Connection pooling (keepalive)
  ✅ SSL session caching
  ✅ OCSP stapling
  ✅ Proxy buffering

Backend Level:
  ✅ PM2 cluster mode
  ✅ Redis caching
  ✅ Database connection pooling
  ✅ Async/await operations
  ✅ Query optimization

Database Level:
  ✅ Indexes on key columns
  ✅ Connection pooling
  ✅ Query caching
  ✅ Materialized views
```

---

## 🔄 Deployment Process

```
┌─────────────────────────────────────────────────────────┐
│              DEPLOYMENT WORKFLOW                         │
└─────────────────────────────────────────────────────────┘

Phase 1: Preparation
  1. Configure DNS
  2. Verify server requirements
  3. Ensure backend is running
  4. Open firewall ports

Phase 2: Installation
  1. Install Nginx
  2. Install Certbot
  3. Configure firewall
  4. Verify installations

Phase 3: SSL Setup
  1. Run setup script
  2. Obtain SSL certificate
  3. Configure Nginx
  4. Test HTTPS

Phase 4: Configuration
  1. Update backend CORS
  2. Update frontend URLs
  3. Restart services
  4. Verify functionality

Phase 5: Verification
  1. Test API endpoints
  2. Check SSL grade
  3. Monitor logs
  4. Test auto-renewal
```

---

## 🔍 Monitoring Points

```
┌─────────────────────────────────────────────────────────┐
│              MONITORING ARCHITECTURE                     │
└─────────────────────────────────────────────────────────┘

System Level:
  • CPU usage
  • Memory usage
  • Disk space
  • Network traffic

Service Level:
  • Nginx status
  • Backend status (PM2)
  • Database connections
  • Redis connections

Application Level:
  • API response times
  • Error rates
  • Request counts
  • Active users

Security Level:
  • SSL certificate expiry
  • Failed login attempts
  • Rate limit triggers
  • Suspicious requests

Logs:
  • Nginx access log
  • Nginx error log
  • Backend application log
  • Database query log
```

---

## 🎯 High Availability Setup (Optional)

```
For production environments requiring high availability:

┌─────────────────────────────────────────────────────────┐
│                  LOAD BALANCER                           │
│              (Nginx / HAProxy)                           │
└────────────┬────────────────────────────┬────────────────┘
             │                            │
    ┌────────▼────────┐         ┌────────▼────────┐
    │   Server 1      │         │   Server 2      │
    │                 │         │                 │
    │  Nginx + API    │         │  Nginx + API    │
    │  PostgreSQL     │◄────────┤  PostgreSQL     │
    │  Redis          │ Replica │  Redis          │
    └─────────────────┘         └─────────────────┘

Features:
  • Load balancing
  • Failover
  • Database replication
  • Redis clustering
  • Session persistence
```

---

## 📝 Summary

This architecture provides:

✅ **Security:** SSL/TLS, firewall, rate limiting  
✅ **Performance:** HTTP/2, compression, caching  
✅ **Reliability:** Auto-renewal, monitoring, logging  
✅ **Scalability:** Can be extended to multi-server setup  
✅ **Maintainability:** Clear structure, comprehensive logs  

---

**Architecture Version:** 1.0.0  
**Last Updated:** 2025-11-03  
**Production Ready:** ✅

