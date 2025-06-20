# Contributing to Nural App

Thank you for your interest in contributing to Nural! This document provides guidelines for contributing to the project.

## 🛠️ Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/nural-app.git
   cd nural-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## 📋 Development Guidelines

### Code Style

- **TypeScript**: Use strict TypeScript. Avoid `any` types.
- **ESLint**: Follow the configured ESLint rules
- **Prettier**: Code is auto-formatted on save
- **File Naming**: Use kebab-case for files, PascalCase for components

### Component Organization

Follow the patterns established in `CLAUDE.md`:

```
app/components/
├── features/    # Feature-specific components
├── layout/      # Layout components  
└── ui/         # Reusable UI components

app/lib/        # Business logic and utilities
app/types/      # Type definitions
app/models/     # Data model interfaces
```

### Git Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/description-of-feature
   ```

2. **Make atomic commits**
   ```bash
   git commit -m "feat: add new component for user profiles"
   ```

3. **Follow conventional commits**
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `refactor:` for code refactoring
   - `test:` for adding tests
   - `chore:` for maintenance tasks

### Testing

- **Write tests** for new features and bug fixes
- **Run tests** before submitting: `npm test`
- **Check coverage**: `npm run test:coverage`
- **Test types**: Unit tests for components/utilities, integration tests for workflows

### Code Reviews

- **Small PRs**: Keep pull requests focused and small
- **Clear descriptions**: Explain what and why, not just how
- **Screenshots**: Include screenshots for UI changes
- **Tests**: Ensure all tests pass
- **Documentation**: Update docs for API changes

## 🎯 Areas for Contribution

### High Priority
- **Performance optimizations**
- **Accessibility improvements**
- **Bug fixes**
- **Test coverage improvements**

### Medium Priority
- **New UI components**
- **Feature enhancements**
- **Documentation improvements**
- **Code refactoring**

### Low Priority
- **Developer tooling**
- **Build optimizations**
- **Code cleanup**

## 🧪 Testing Guidelines

### Writing Tests

```typescript
// Component test example
import { render, screen } from '@/__tests__/setup/test-utils'
import MyComponent from '@/app/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Test Structure

- **Unit tests**: `__tests__/components/`, `__tests__/hooks/`, `__tests__/utils/`
- **Integration tests**: `__tests__/integration/`
- **Test utilities**: `__tests__/setup/`

## 🚨 Bug Reports

When reporting bugs, please include:

1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Environment details** (OS, browser, Node version)
5. **Screenshots** if applicable
6. **Console errors** if any

## 💡 Feature Requests

For feature requests:

1. **Check existing issues** to avoid duplicates
2. **Describe the problem** you're trying to solve
3. **Propose a solution** with implementation details
4. **Consider alternatives** and their trade-offs
5. **Assess impact** on existing features

## 📝 Documentation

When updating documentation:

- **Keep it concise** but comprehensive
- **Include examples** for complex concepts
- **Update README.md** for setup changes
- **Update CLAUDE.md** for development patterns
- **Add inline comments** for complex logic only

## 🔍 Code Review Checklist

Before requesting review:

- [ ] Code follows TypeScript best practices
- [ ] No console.log statements in production code
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] No breaking changes without migration path
- [ ] Performance impact is considered
- [ ] Accessibility is maintained
- [ ] Error handling is implemented

## 📦 Release Process

1. **Version bumping** follows semantic versioning
2. **Changelog** is updated with notable changes
3. **Migration guides** for breaking changes
4. **Testing** on staging before production
5. **Deployment** through CI/CD pipeline

## 🤝 Community Guidelines

- **Be respectful** and inclusive
- **Help others** learn and contribute
- **Provide constructive feedback**
- **Follow the code of conduct**
- **Ask questions** when unclear

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Documentation**: Check CLAUDE.md for patterns
- **Code review**: Ask for feedback early and often

Thank you for contributing to Nural! 🙏