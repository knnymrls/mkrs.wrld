import React, { ReactElement, createContext } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { User } from '@supabase/supabase-js'

// Create a mock AuthContext since we can't import the real one in tests
const AuthContext = createContext<any>(null)

// Mock user for testing
export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  confirmed_at: '2024-01-01T00:00:00.000Z',
  last_sign_in_at: '2024-01-01T00:00:00.000Z',
  role: 'authenticated',
}

// Mock auth context value
const mockAuthContextValue = {
  user: mockUser,
  session: null,
  loading: false,
  hasProfile: true,
  refreshProfile: jest.fn(),
  signOut: jest.fn(),
}

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContextValue?: Partial<typeof mockAuthContextValue>
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { authContextValue, ...renderOptions } = options || {}
  
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <AuthContext.Provider value={{ ...mockAuthContextValue, ...authContextValue }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return render(ui, { wrapper: AllTheProviders, ...renderOptions })
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Utility functions for common test scenarios
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Mock data generators
export const createMockPost = (overrides = {}) => ({
  id: 'test-post-id',
  content: 'Test post content',
  created_at: '2024-01-01T00:00:00.000Z',
  author: {
    id: 'test-author-id',
    name: 'Test Author',
    avatar_url: null,
  },
  mentions: [],
  likes_count: 0,
  comments_count: 0,
  user_has_liked: false,
  type: 'post' as const,
  ...overrides,
})

export const createMockProfile = (overrides = {}) => ({
  id: 'test-profile-id',
  name: 'Test User',
  title: 'Software Engineer',
  bio: 'Test bio',
  avatar_url: null,
  location: 'Test Location',
  created_at: '2024-01-01T00:00:00.000Z',
  skills: [],
  type: 'profile' as const,
  ...overrides,
})

export const createMockProject = (overrides = {}) => ({
  id: 'test-project-id',
  title: 'Test Project',
  description: 'Test project description',
  status: 'active' as const,
  created_at: '2024-01-01T00:00:00.000Z',
  created_by: 'test-user-id',
  contributors: [],
  type: 'project' as const,
  ...overrides,
})