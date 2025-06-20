# Testing Guide for Nural App

## Overview
This project uses Jest and React Testing Library for unit and integration testing.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm test:watch

# Run tests with coverage report
npm test:coverage

# Run tests with verbose output
npm test:verbose
```

## Test Structure

```
__tests__/
├── components/           # Component tests
│   ├── features/        # Feature component tests
│   └── ui/              # UI component tests
├── hooks/               # Custom hook tests
├── utils/               # Utility function tests
└── setup/               # Test configuration and utilities
    └── test-utils.tsx   # Custom render functions and mocks
```

## Writing Tests

### Component Tests
```typescript
import { render, screen, fireEvent } from '@/__tests__/setup/test-utils'
import MyComponent from '@/app/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Hook Tests
```typescript
import { renderHook } from '@testing-library/react'
import useMyHook from '@/app/hooks/useMyHook'

describe('useMyHook', () => {
  it('returns expected value', () => {
    const { result } = renderHook(() => useMyHook())
    expect(result.current).toBe(expectedValue)
  })
})
```

## Mock Utilities

The following are automatically mocked in `jest.setup.js`:
- Next.js navigation (useRouter, useSearchParams, usePathname)
- Supabase client
- Window.matchMedia

## Custom Test Utils

Use the custom render function from `test-utils.tsx` which includes:
- AuthContext provider with mock user
- Custom render options
- Mock data generators (createMockPost, createMockProfile, etc.)

## Coverage Goals

Aim for:
- 80% overall coverage
- 90% coverage for utility functions
- 70% coverage for components
- Focus on testing business logic and user interactions