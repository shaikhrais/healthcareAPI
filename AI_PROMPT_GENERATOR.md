# Automated Prompt Generator for New Code Development

## 🤖 AI-Assisted Development Prompts

This system provides standardized prompts for AI assistants (like GitHub Copilot, ChatGPT, Claude) to maintain consistency when developing new code for the Healthcare API system.

## 🎯 System Context Template

### Base System Prompt
```
You are an expert healthcare API developer working on a large-scale Node.js/Express.js system with the following specifications:

SYSTEM OVERVIEW:
- Healthcare Management API with 1,297 endpoints across 73 route files
- 10+ modules: auth, patients, appointments, clinical, billing, communication, analytics, administration, staff
- Tech Stack: Node.js, Express.js, MongoDB, Mongoose, JWT authentication, Swagger/OpenAPI 3.0
- Compliance: HIPAA healthcare requirements
- Team: SDE1 (junior) and SDE2 (senior) developers

CODE STANDARDS:
- Follow existing patterns in the codebase
- Implement comprehensive input validation with express-validator
- Include proper error handling and logging
- Maintain security best practices for healthcare data
- Add Swagger documentation for all endpoints
- Write unit tests with 80%+ coverage target
- Use role-based authorization (admin, provider, staff, patient)

CURRENT PROJECT STATUS:
- Documentation: 30.1% complete (22/73 files documented)  
- Priority: Complete Swagger documentation for remaining 51 files
- Focus: Maintain code quality while scaling development

Please ensure all suggestions follow these established patterns and healthcare compliance requirements.
```

## 📝 Feature Development Prompts

### 1. New Route/Endpoint Development
```
PROMPT: Create New Healthcare API Endpoint

Context: I need to create a new [ENDPOINT_TYPE] endpoint for the [MODULE_NAME] module in our healthcare API system.

Requirements:
- Endpoint: [METHOD] /api/[module]/[resource]
- Purpose: [DESCRIBE_FUNCTIONALITY]
- Role Access: [SPECIFY_ROLES: admin/provider/staff/patient]
- Input Data: [DESCRIBE_EXPECTED_INPUT]
- Business Logic: [DESCRIBE_PROCESSING_REQUIREMENTS]

Please provide:
1. Complete route file following our established patterns
2. Controller implementation with proper error handling
3. Input validation using express-validator
4. Swagger documentation with complete schemas
5. Unit test examples
6. Security considerations for healthcare data

Use our standard structure:
- Authentication middleware
- Role-based authorization
- Rate limiting
- Input validation
- Controller logic with try-catch
- Standardized response format

Ensure HIPAA compliance for any patient health information (PHI) handling.
```

### 2. Database Model Creation
```
PROMPT: Create Healthcare Database Model

Context: I need to create a new Mongoose model for [MODEL_NAME] in our healthcare API system.

Requirements:
- Model Purpose: [DESCRIBE_DATA_ENTITY]
- Related Models: [LIST_RELATIONSHIPS]
- Business Rules: [SPECIFY_VALIDATION_RULES]
- Compliance Needs: [PHI/SENSITIVE_DATA_HANDLING]

Please provide:
1. Complete Mongoose schema with proper validation
2. Indexes for performance optimization
3. Instance methods for common operations
4. Static methods for queries
5. Middleware for data processing (pre/post hooks)
6. Security considerations for sensitive data
7. Audit trail implementation if handling PHI

Follow our patterns:
- Timestamps enabled
- Soft delete capability for compliance
- Proper field validation and constraints
- Reference fields to related models
- Enum values where applicable
```

### 3. Service Layer Implementation
```
PROMPT: Create Healthcare Service Layer

Context: I need to implement business logic services for [FEATURE_NAME] in our healthcare API.

Requirements:
- Service Purpose: [DESCRIBE_BUSINESS_LOGIC]
- Data Operations: [LIST_CRUD_OPERATIONS]
- Integration Points: [EXTERNAL_SYSTEMS_IF_ANY]
- Compliance Requirements: [HIPAA_SPECIFIC_NEEDS]

Please provide:
1. Service class with proper error handling
2. Business logic validation methods
3. Database transaction handling where needed
4. Logging for audit trails
5. Input sanitization and validation
6. Event emission for system notifications
7. Cache integration where appropriate

Ensure:
- Separation of concerns from controllers
- Proper error propagation
- Healthcare compliance in data processing
- Performance optimization for large datasets
```

### 4. Security Enhancement
```
PROMPT: Healthcare API Security Enhancement

Context: I need to enhance security for [SPECIFIC_AREA] in our healthcare API system.

Current Security Measures:
- JWT-based authentication
- Role-based access control (admin, provider, staff, patient)
- Input validation with express-validator
- Rate limiting with express-rate-limit
- CORS configuration

Enhancement Needed:
- [DESCRIBE_SECURITY_REQUIREMENT]
- [COMPLIANCE_NEED]
- [THREAT_MITIGATION_GOAL]

Please provide:
1. Security middleware implementation
2. Enhanced authentication/authorization logic
3. Data encryption strategies for PHI
4. Audit logging implementation
5. Security testing recommendations
6. Compliance validation steps

Must meet HIPAA requirements for healthcare data protection.
```

## 🧪 Testing Prompt Templates

### 1. Unit Test Generation
```
PROMPT: Generate Healthcare API Unit Tests

Context: Create comprehensive unit tests for [MODULE/FEATURE] in our healthcare API.

Code to Test:
[PASTE_CODE_HERE]

Testing Requirements:
- Framework: Jest
- Coverage Target: 80%+
- Test Types: Unit tests for controllers and services
- Mock Requirements: Database calls, external APIs, authentication
- Edge Cases: Invalid inputs, error scenarios, boundary conditions

Please provide:
1. Complete test suite with describe/it blocks
2. Mock implementations for dependencies
3. Test data setup and teardown
4. Happy path and error scenario tests
5. Authentication testing with different roles
6. Input validation testing
7. Healthcare-specific edge cases

Ensure tests cover:
- All endpoint responses (success/error)
- Role-based access control
- Input validation scenarios
- Business logic edge cases
- HIPAA compliance aspects
```

### 2. Integration Test Creation
```
PROMPT: Healthcare API Integration Tests

Context: Create integration tests for [FEATURE_WORKFLOW] in our healthcare system.

Workflow to Test:
- [STEP_1: DESCRIBE_FIRST_ACTION]
- [STEP_2: DESCRIBE_SECOND_ACTION]
- [STEP_3: DESCRIBE_FINAL_OUTCOME]

Requirements:
- Test Framework: Jest with supertest
- Database: MongoDB test instance
- Authentication: JWT token testing
- Data Flow: Multi-endpoint workflow testing

Please provide:
1. Complete integration test suite
2. Test database setup and cleanup
3. Authentication token generation for testing
4. Multi-step workflow validation
5. Data consistency verification
6. Error handling in workflow interruption
7. Performance benchmarks for critical paths

Focus on healthcare-specific workflows and compliance validation.
```

## 📚 Documentation Prompt Templates

### 1. Swagger Documentation Generation
```
PROMPT: Generate Swagger Documentation for Healthcare API

Context: Create comprehensive Swagger/OpenAPI 3.0 documentation for [ROUTE_FILE] in our healthcare API.

Route File: [PATH_TO_FILE]
Endpoints to Document: [LIST_ENDPOINTS]

Current Documentation Standard:
- OpenAPI 3.0 specification
- Complete request/response schemas
- Authentication requirements (bearerAuth)
- Role-based access documentation
- Error response standardization
- Healthcare-specific data handling notes

Please provide:
1. Complete Swagger JSDoc comments for all endpoints
2. Request/response schema definitions
3. Parameter validation documentation
4. Authentication and authorization requirements
5. Error response schemas (400, 401, 403, 500)
6. Healthcare compliance notes where applicable
7. Example requests and responses

Follow our established schema patterns and ensure all endpoints are fully documented.
```

### 2. Technical Documentation
```
PROMPT: Create Technical Documentation for Healthcare Feature

Context: Generate comprehensive technical documentation for [FEATURE_NAME] in our healthcare API system.

Feature Details:
- Purpose: [BUSINESS_FUNCTIONALITY]
- Technical Implementation: [ARCHITECTURE_OVERVIEW]
- Integration Points: [RELATED_SYSTEMS]
- Compliance Aspects: [HIPAA_REQUIREMENTS]

Documentation Needed:
1. Architecture overview with diagrams
2. API endpoint documentation
3. Database schema descriptions
4. Security implementation details
5. Error handling strategies
6. Performance considerations
7. Maintenance and troubleshooting guides

Target Audience: SDE1/SDE2 developers, project managers, and technical stakeholders.
```

## 🔧 Maintenance & Optimization Prompts

### 1. Code Refactoring
```
PROMPT: Healthcare API Code Refactoring

Context: Refactor [COMPONENT_NAME] to improve [SPECIFIC_GOAL: performance/maintainability/security].

Current Code:
[PASTE_EXISTING_CODE]

Refactoring Goals:
- [PERFORMANCE_IMPROVEMENTS]
- [CODE_QUALITY_ENHANCEMENTS]
- [SECURITY_HARDENING]
- [MAINTAINABILITY_IMPROVEMENTS]

Please provide:
1. Refactored code following our established patterns
2. Performance improvements explanation
3. Security enhancements made
4. Backward compatibility considerations
5. Migration strategy if breaking changes
6. Updated unit tests for refactored code
7. Documentation updates needed

Maintain all existing functionality while improving the specified aspects.
```

### 2. Performance Optimization
```
PROMPT: Healthcare API Performance Optimization

Context: Optimize [COMPONENT/ENDPOINT] performance in our healthcare API system.

Current Performance Issue:
- [DESCRIBE_BOTTLENECK]
- [CURRENT_METRICS]
- [TARGET_PERFORMANCE]

System Constraints:
- Large dataset: 1,297 endpoints across 73 files
- Healthcare compliance requirements
- Real-time response needs for clinical systems
- Database: MongoDB with Mongoose ODM

Please provide:
1. Performance analysis of current implementation
2. Optimization strategies (caching, indexing, query optimization)
3. Code improvements with benchmarks
4. Database optimization recommendations
5. Caching strategy implementation
6. Load testing considerations
7. Monitoring and alerting setup

Ensure optimizations don't compromise healthcare data security or compliance.
```

## 🚀 Deployment & DevOps Prompts

### 1. CI/CD Pipeline Setup
```
PROMPT: Healthcare API CI/CD Pipeline Configuration

Context: Set up CI/CD pipeline for our healthcare API with compliance and security requirements.

System Requirements:
- Node.js/Express.js application
- MongoDB database
- HIPAA compliance needs
- Multi-environment deployment (dev/staging/prod)
- Security scanning and compliance validation

Please provide:
1. GitHub Actions/Jenkins pipeline configuration
2. Automated testing integration (unit/integration/security)
3. Code quality gates and compliance checks
4. Secure secrets management
5. Database migration handling
6. Environment-specific configuration management
7. Rollback strategy implementation
8. Health check and monitoring integration

Ensure pipeline meets healthcare industry security standards.
```

### 2. Monitoring & Alerting Setup
```
PROMPT: Healthcare API Monitoring and Alerting

Context: Implement comprehensive monitoring for our healthcare API system.

Monitoring Requirements:
- API performance and availability
- Database health and performance
- Security events and compliance
- Business metrics and usage patterns
- Error tracking and alerting

System Scale:
- 1,297 endpoints across 73 route files
- Healthcare compliance requirements
- 24/7 availability needs for clinical systems

Please provide:
1. Application performance monitoring setup
2. Database monitoring configuration
3. Security event logging and alerting
4. Custom metrics for healthcare workflows
5. Dashboard configuration for stakeholders
6. Alerting rules and escalation procedures
7. Log aggregation and analysis setup
8. Compliance reporting automation

Focus on proactive monitoring for healthcare-critical systems.
```

## 🎯 Prompt Usage Guidelines

### For SDE1 Developers
```
Recommended Prompts:
✅ New Route/Endpoint Development (with guidance)
✅ Unit Test Generation
✅ Swagger Documentation Generation
✅ Simple database model creation
✅ Code refactoring for specific functions

Avoid:
❌ Complex architecture decisions
❌ Security implementation design
❌ Performance optimization strategy
❌ CI/CD pipeline configuration
```

### For SDE2 Developers
```
Recommended Prompts:
✅ All prompt categories
✅ Complex feature architecture
✅ Security enhancement planning
✅ Performance optimization strategy
✅ Integration testing design
✅ Technical documentation creation

Focus Areas:
- System-wide impact considerations
- Security and compliance validation
- Performance and scalability planning
- Team mentorship and code review
```

### For Project Managers
```
Recommended Prompts:
✅ Technical documentation for stakeholders
✅ Deployment planning and risk assessment
✅ Monitoring and alerting strategy
✅ Compliance validation planning
✅ Performance benchmark definition

Use Cases:
- Stakeholder communication preparation
- Risk assessment and mitigation planning
- Resource planning and timeline estimation
- Quality assurance strategy development
```

## 📋 Prompt Customization Checklist

Before using any prompt, customize these variables:
- [ ] [MODULE_NAME] - Specific module (auth, patients, clinical, etc.)
- [ ] [ENDPOINT_TYPE] - HTTP method and resource type
- [ ] [FUNCTIONALITY] - Specific business requirement
- [ ] [ROLES] - Required access levels
- [ ] [COMPLIANCE_NEEDS] - HIPAA or security requirements
- [ ] [CURRENT_CODE] - Existing code context if applicable
- [ ] [PERFORMANCE_GOALS] - Specific metrics or improvements needed

---

**Usage Note**: These prompts are designed to maintain consistency with our established patterns while leveraging AI assistance for development tasks. Always review AI-generated code for compliance with healthcare requirements and our coding standards.