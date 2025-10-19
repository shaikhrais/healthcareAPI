# 🔒 HTTPS Setup for HealthCare API

## ✅ **HTTPS Successfully Enabled!**

Your HealthCare API now supports **both HTTP and HTTPS** for secure local development!

## 🎯 **What's Implemented**

### ✅ **Dual Server Support**
- **HTTP Server**: `http://localhost:3001`
- **HTTPS Server**: `https://localhost:3443`
- **Automatic Detection**: Server starts both if SSL certificates are available

### ✅ **SSL Certificate Generation**
- **Self-signed certificates** for localhost development
- **2048-bit RSA encryption** with SHA-256 algorithm
- **365-day validity** for long-term development
- **Subject Alternative Names**: localhost, 127.0.0.1, ::1

### ✅ **WebSocket HTTPS Support**
- WebSocket works on both HTTP and HTTPS
- **HTTP**: `ws://localhost:3001/ws/dashboard`
- **HTTPS**: `wss://localhost:3443/ws/dashboard`

### ✅ **Swagger Documentation**
- **HTTP Swagger**: http://localhost:3001/api-docs
- **HTTPS Swagger**: https://localhost:3443/api-docs
- Both servers documented in OpenAPI spec

## 🚀 **Quick Start**

### **Option 1: Generate Certificates & Start**
```bash
npm run start:https
```
This will:
1. Generate SSL certificates (if needed)
2. Start both HTTP and HTTPS servers

### **Option 2: Manual Certificate Generation**
```bash
npm run generate-ssl-cert
npm start
```

### **Option 3: Docker with HTTPS**
```bash
# Generate certificates first
npm run generate-ssl-cert

# Start Docker with HTTPS support
docker-compose up -d
```

## 📋 **Server Startup Output**
When HTTPS is enabled, you'll see:
```
🎉 HealthCare Management API Started!
🌐 HTTP Server: http://localhost:3001
🔒 HTTPS Server: https://localhost:3443
📚 Swagger: http://localhost:3001/api-docs
🔒 Swagger (HTTPS): https://localhost:3443/api-docs
🔒 HTTPS server started successfully!
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# .env file
PORT=3001                    # HTTP port
HTTPS_PORT=3443             # HTTPS port (configurable)
NODE_ENV=development        # Environment
```

### **SSL Certificate Locations**
```
ssl/
├── cert.pem               # SSL certificate
├── key.pem                # Private key
└── generate-cert.js       # Certificate generator script
```

## 🌐 **Available Endpoints**

### **HTTP Endpoints**
- Health Check: http://localhost:3001/health
- API Status: http://localhost:3001/api/status
- Swagger UI: http://localhost:3001/api-docs
- WebSocket: ws://localhost:3001/ws/dashboard

### **HTTPS Endpoints**
- Health Check: https://localhost:3443/health
- API Status: https://localhost:3443/api/status
- Swagger UI: https://localhost:3443/api-docs
- WebSocket: wss://localhost:3443/ws/dashboard

## 🔒 **Security Features**

### **SSL/TLS Configuration**
- **Protocol**: TLS 1.2+ (Node.js default)
- **Key Size**: 2048-bit RSA
- **Hash Algorithm**: SHA-256
- **Certificate Extensions**: Key usage, Subject Alt Names

### **Development vs Production**
- **Development**: Self-signed certificates (browser warnings expected)
- **Production**: Use proper CA-signed certificates
- **Security Headers**: Automatically enabled in production mode

## 🧪 **Testing HTTPS**

### **PowerShell (Ignore Self-Signed Certificate)**
```powershell
# Disable certificate validation for testing
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

# Test HTTPS endpoint
Invoke-RestMethod -Uri "https://localhost:3443/health" -Method GET
```

### **cURL**
```bash
# Test HTTPS (ignore certificate errors)
curl -k https://localhost:3443/health

# Test WebSocket over HTTPS
curl -k -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" https://localhost:3443/ws/dashboard
```

### **Browser Testing**
1. Navigate to: https://localhost:3443/api-docs
2. Accept security warning (self-signed certificate)
3. Enjoy secure Swagger documentation!

## 🐳 **Docker HTTPS Support**

### **Docker Compose Configuration**
The `docker-compose.yml` includes:
```yaml
ports:
  - "3001:3001"      # HTTP
  - "3443:3443"      # HTTPS
volumes:
  - ./ssl:/app/ssl   # SSL certificates
```

### **Docker HTTPS Usage**
```bash
# 1. Generate certificates locally
npm run generate-ssl-cert

# 2. Start Docker stack
docker-compose up -d

# 3. Access HTTPS API
curl -k https://localhost:3443/health
```

## 📊 **NPM Scripts**

| Command | Description |
|---------|-------------|
| `npm start` | Start server (HTTPS if certs exist) |
| `npm run start:https` | Generate certs + start server |
| `npm run generate-ssl-cert` | Generate SSL certificates only |
| `npm run dev` | Development mode with nodemon |

## ⚠️ **Important Notes**

### **Self-Signed Certificate Warnings**
- Browsers will show security warnings
- This is **normal and safe** for development
- Click "Advanced" → "Proceed to localhost"

### **Production Considerations**
- Replace self-signed certificates with CA-signed certificates
- Use proper domain names (not localhost)
- Enable additional security headers
- Configure proper CORS for HTTPS origins

### **WebSocket Secure (WSS)**
- HTTPS automatically enables WSS (WebSocket Secure)
- Use `wss://localhost:3443/ws/dashboard` for secure WebSocket connections
- JWT authentication works the same way

## 🎯 **Benefits**

### **Security**
- ✅ **Encrypted communication** between client and server
- ✅ **Data integrity** protection
- ✅ **Authentication** for secure connections

### **Development**
- ✅ **Production-like environment** for testing
- ✅ **HTTPS-only features** testing (service workers, etc.)
- ✅ **Mixed content** issue prevention

### **Compliance**
- ✅ **Healthcare data protection** (HIPAA considerations)
- ✅ **Security best practices** implementation
- ✅ **Modern web standards** compliance

---

**🎉 HTTPS Status**: ✅ **FULLY OPERATIONAL**  
**🔧 Configuration**: ✅ **COMPLETE**  
**📚 Documentation**: ✅ **COMPREHENSIVE**  
**🐳 Docker Support**: ✅ **INTEGRATED**

Your HealthCare Management API now provides **enterprise-grade security** for local development! 🚀