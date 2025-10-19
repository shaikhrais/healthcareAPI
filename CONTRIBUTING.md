# Contributing to HealthCare API

Thank you for considering contributing to the HealthCare API project! 

## 🤝 How to Contribute

### 1. Fork & Clone
```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/healthcareAPI.git
cd healthcareAPI

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/healthcareAPI.git
```

### 2. Set Up Development Environment
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev
```

### 3. Create Feature Branch
```bash
# Create and switch to feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 4. Make Changes
- Write clean, documented code
- Follow existing code style
- Add tests for new features
- Update documentation

### 5. Test Your Changes
```bash
# Run all tests
npm test

# Run linting
npm run lint

# Check code coverage
npm run test:coverage
```

### 6. Commit & Push
```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add patient search functionality"

# Push to your fork
git push origin feature/your-feature-name
```

### 7. Create Pull Request
- Go to GitHub and create a pull request
- Provide clear description of changes
- Reference any related issues

## 📝 Coding Standards

### Code Style
- Use ESLint configuration provided
- Follow JavaScript Standard Style
- Use meaningful variable names
- Comment complex logic

### Commit Messages
Follow conventional commits format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### File Structure
```
src/modules/[module-name]/
├── controllers/    # Route handlers
├── models/        # Database models
├── routes/        # Express routes
├── services/      # Business logic
├── middleware/    # Module-specific middleware
└── index.js       # Module entry point
```

## 🧪 Testing Guidelines

### Test Types
- **Unit Tests**: Test individual functions
- **Integration Tests**: Test API endpoints
- **E2E Tests**: Test complete user workflows

### Writing Tests
```javascript
// Unit test example
describe('PatientService', () => {
  test('should create new patient', async () => {
    const patientData = { name: 'John Doe', email: 'john@example.com' };
    const result = await PatientService.create(patientData);
    expect(result).toBeDefined();
    expect(result.name).toBe('John Doe');
  });
});
```

## 📚 Documentation

### API Documentation
- Use JSDoc comments for functions
- Update Swagger/OpenAPI specs
- Provide example requests/responses

### README Updates
- Update features list for new functionality
- Add configuration options
- Update installation instructions

## 🐛 Bug Reports

When reporting bugs, please include:
- Operating system and version
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Error messages and stack traces

## 💡 Feature Requests

For new features:
- Describe the use case
- Explain the benefit
- Provide implementation ideas
- Consider backwards compatibility

## 🔒 Security

For security issues:
- Do NOT create public issues
- Email security@healthcare-api.com
- Provide detailed description
- Include steps to reproduce

## 📋 Code Review Process

### Before Review
- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No sensitive data committed

### Review Criteria
- Code quality and readability
- Test coverage
- Performance impact
- Security considerations
- API design consistency

## 🏷️ Release Process

### Version Numbering
Follow semantic versioning (SemVer):
- `MAJOR.MINOR.PATCH`
- Major: Breaking changes
- Minor: New features (backwards compatible)
- Patch: Bug fixes

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Git tag created

## 🌟 Recognition

Contributors will be:
- Listed in AUTHORS file
- Mentioned in release notes
- Invited to maintainer team (for significant contributions)

## 📞 Getting Help

- **Discord**: [Community Server](https://discord.gg/healthcare-api)
- **GitHub Discussions**: For questions and ideas
- **GitHub Issues**: For bugs and feature requests

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping make healthcare technology better! 🏥✨**