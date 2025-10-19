# Healthcare Management API

A comprehensive healthcare practice management system built with Node.js, Express, and MongoDB.

## 🏥 Features

- **Patient Management**: Complete patient records, demographics, medical history
- **Appointment Scheduling**: Calendar management, availability tracking, check-in system
- **Clinical Documentation**: Medical notes, treatment plans, assessments
- **Billing & Insurance**: Claims processing, payment plans, insurance verification
- **Communication**: Secure messaging, notifications, patient portals
- **Analytics**: Reporting, dashboards, business intelligence
- **Mobile Support**: Offline sync, push notifications, health integrations
- **Administration**: User management, role-based access, system monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- MongoDB 4.4+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd healthCare/API
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev
```

5. Visit the API documentation:
```
http://localhost:3001/api-docs
```

## 🐳 Docker Deployment

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 API Documentation

- **Swagger UI**: `http://localhost:3001/api-docs`
- **OpenAPI JSON**: `http://localhost:3001/api-docs.json`
- **Health Check**: `http://localhost:3001/health`
- **API Status**: `http://localhost:3001/api/status`

## 🏗️ Architecture

### Module Structure
```
src/
├── modules/
│   ├── auth/              # Authentication & authorization
│   ├── patients/          # Patient management
│   ├── appointments/      # Scheduling system
│   ├── clinical/          # Medical records
│   ├── billing/           # Payment processing
│   ├── communication/     # Messaging & notifications
│   ├── analytics/         # Reports & dashboards
│   ├── staff/             # Staff management
│   └── administration/    # System administration
└── shared/
    ├── config/            # Configuration management
    ├── middleware/        # Express middleware
    ├── services/          # Business logic
    └── utils/             # Utility functions
```

### Key Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/patients` - Patient listing
- `POST /api/appointments` - Schedule appointment
- `GET /api/clinical/notes` - Medical notes
- `POST /api/billing/payments` - Process payment
- `GET /api/analytics/reports` - Generate reports

## 🔒 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting
- Input validation
- Security headers
- Audit logging

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration

# Run with coverage
npm run test:coverage
```

## 📦 Deployment

### Environment Variables
Required environment variables for production:

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://mongodb:27017/healthcare
JWT_SECRET=your-secure-jwt-secret
STRIPE_SECRET_KEY=sk_live_...
TWILIO_ACCOUNT_SID=AC...
SENDGRID_API_KEY=SG...
```

### Production Checklist
- [ ] Set strong JWT secret
- [ ] Configure production database
- [ ] Set up SSL/TLS certificates
- [ ] Configure monitoring and logging
- [ ] Set up backup procedures
- [ ] Enable rate limiting
- [ ] Security audit

## 📊 Monitoring

### Health Checks
- `GET /health` - Basic health status
- `GET /api/status` - Detailed system status

### Logging
Logs are written to:
- Console (development)
- `logs/app.log` (application logs)
- `logs/error.log` (error logs)

### Metrics
Monitor these key metrics:
- Response times
- Error rates
- Database connections
- Memory usage
- Active users

## 🔧 Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run code linting
- `npm run build` - Build for production

### Adding New Modules
1. Create module directory in `src/modules/`
2. Add routes, models, and services
3. Register module in `server.js`
4. Add Swagger documentation
5. Create tests

## 📋 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

## 📞 Support

- **Documentation**: See `/docs` folder for detailed guides
- **API Reference**: Available at `/api-docs`
- **Issues**: Create GitHub issues for bugs
- **Security**: Report security issues privately

## 📄 License

MIT License - see LICENSE file for details

## 🔄 Version History

### v1.0.0 (Current)
- Initial release with core healthcare modules
- Complete API documentation
- Authentication and authorization
- Patient and appointment management
- Basic reporting and analytics

---

**🏥 Ready to revolutionize healthcare management!**