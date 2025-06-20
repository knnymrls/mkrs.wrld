import React from 'react'
import { render, screen, fireEvent } from '@/__tests__/setup/test-utils'
import ActivityFeedHeader from '@/app/(main)/components/ActivityFeedHeader'
import NotificationDropdown from '@/app/components/features/NotificationDropdown'

// Mock the NotificationDropdown component
jest.mock('@/app/components/features/NotificationDropdown', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}))

describe('ActivityFeedHeader', () => {
  const mockOnCreatePost = jest.fn()
  const mockOnPostClick = jest.fn()
  const userId = 'test-user-id'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the title', () => {
    render(
      <ActivityFeedHeader
        userId={userId}
        onCreatePost={mockOnCreatePost}
        onPostClick={mockOnPostClick}
      />
    )

    expect(screen.getByText('Activity Feed')).toBeInTheDocument()
  })

  it('renders NotificationDropdown when userId is provided', () => {
    render(
      <ActivityFeedHeader
        userId={userId}
        onCreatePost={mockOnCreatePost}
        onPostClick={mockOnPostClick}
      />
    )

    // Check that NotificationDropdown was called
    expect(NotificationDropdown).toHaveBeenCalled()
    
    // Check the props passed to the first call
    const firstCallProps = (NotificationDropdown as jest.Mock).mock.calls[0][0]
    expect(firstCallProps).toMatchObject({
      userId,
      onPostClick: mockOnPostClick,
    })
  })

  it('does not render NotificationDropdown when userId is null', () => {
    render(
      <ActivityFeedHeader
        userId={null}
        onCreatePost={mockOnCreatePost}
        onPostClick={mockOnPostClick}
      />
    )

    expect(NotificationDropdown).not.toHaveBeenCalled()
  })

  it('renders the Create button', () => {
    render(
      <ActivityFeedHeader
        userId={userId}
        onCreatePost={mockOnCreatePost}
        onPostClick={mockOnPostClick}
      />
    )

    const createButton = screen.getByRole('button', { name: /create/i })
    expect(createButton).toBeInTheDocument()
    expect(createButton).toHaveTextContent('Create')
  })

  it('calls onCreatePost when Create button is clicked', () => {
    render(
      <ActivityFeedHeader
        userId={userId}
        onCreatePost={mockOnCreatePost}
        onPostClick={mockOnPostClick}
      />
    )

    const createButton = screen.getByRole('button', { name: /create/i })
    fireEvent.click(createButton)

    expect(mockOnCreatePost).toHaveBeenCalledTimes(1)
  })

  it('has proper styling classes', () => {
    render(
      <ActivityFeedHeader
        userId={userId}
        onCreatePost={mockOnCreatePost}
        onPostClick={mockOnPostClick}
      />
    )

    const container = screen.getByText('Activity Feed').closest('div')
    expect(container).toHaveClass('mb-4', 'flex', 'flex-col', 'sm:flex-row')
    
    const createButton = screen.getByRole('button', { name: /create/i })
    expect(createButton).toHaveClass('px-4', 'py-2', 'rounded-full')
  })

  it('renders the plus icon in Create button', () => {
    render(
      <ActivityFeedHeader
        userId={userId}
        onCreatePost={mockOnCreatePost}
        onPostClick={mockOnPostClick}
      />
    )

    const createButton = screen.getByRole('button', { name: /create/i })
    const svg = createButton.querySelector('svg')
    
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass('w-4', 'h-4')
  })

  it('maintains responsive layout', () => {
    const { container } = render(
      <ActivityFeedHeader
        userId={userId}
        onCreatePost={mockOnCreatePost}
        onPostClick={mockOnPostClick}
      />
    )

    const flexContainer = container.querySelector('.sm\\:flex-row')
    expect(flexContainer).toBeInTheDocument()
    expect(flexContainer).toHaveClass('flex-col')
  })
})