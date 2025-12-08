#!/bin/bash

# Self-Signed SSL Certificate Setup Script
# Run this on your backend server (69.164.245.173)

echo "=========================================="
echo "🔒 Self-Signed SSL Certificate Setup"
echo "=========================================="
echo ""

# Get the backend directory
BACKEND_DIR=$(pwd)
echo "📁 Backend directory: $BACKEND_DIR"
echo ""

# Create SSL directory
echo "📂 Creating SSL directory..."
mkdir -p ssl
cd ssl

# Check if certificates already exist
if [ -f "key.pem" ] && [ -f "cert.pem" ]; then
    echo "⚠️  SSL certificates already exist!"
    echo ""
    read -p "Do you want to regenerate them? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Cancelled. Using existing certificates."
        exit 0
    fi
    echo "🔄 Regenerating certificates..."
fi

# Generate self-signed certificate
echo "🔐 Generating self-signed SSL certificate..."
echo ""

openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=EFF/OU=IT/CN=69.164.245.173"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SSL certificates generated successfully!"
    echo ""
    echo "📄 Certificate files:"
    ls -lh key.pem cert.pem
    echo ""
    
    # Set proper permissions
    echo "🔒 Setting file permissions..."
    chmod 600 key.pem
    chmod 644 cert.pem
    echo "✅ Permissions set"
    echo ""
    
    # Display certificate info
    echo "📋 Certificate Information:"
    openssl x509 -in cert.pem -text -noout | grep -E "Subject:|Issuer:|Not Before|Not After"
    echo ""
    
    echo "=========================================="
    echo "✅ SSL Setup Complete!"
    echo "=========================================="
    echo ""
    echo "📝 Next Steps:"
    echo ""
    echo "1. Rebuild backend:"
    echo "   cd $BACKEND_DIR"
    echo "   npm run build"
    echo ""
    echo "2. Restart backend server:"
    echo "   pm2 restart eff-api"
    echo "   # or"
    echo "   pm2 restart eff-backend"
    echo ""
    echo "3. Check logs:"
    echo "   pm2 logs eff-api"
    echo "   # Look for: '✅ SSL certificates found - Creating HTTPS server'"
    echo ""
    echo "4. Test HTTPS endpoint:"
    echo "   curl -k https://69.164.245.173:5000/api/v1/health"
    echo ""
    echo "5. Update frontend .env.production:"
    echo "   VITE_API_BASE_URL=https://69.164.245.173:5000/api/v1"
    echo ""
    echo "6. Rebuild frontend:"
    echo "   npm run build"
    echo ""
    echo "7. Accept certificate in browser:"
    echo "   Visit: https://69.164.245.173:5000/api/v1/health"
    echo "   Click 'Advanced' → 'Proceed to 69.164.245.173 (unsafe)'"
    echo ""
    echo "⚠️  Note: Browser will show security warning (expected for self-signed certs)"
    echo ""
    
else
    echo ""
    echo "❌ Failed to generate SSL certificates!"
    echo "Please check OpenSSL installation and try again."
    exit 1
fi

