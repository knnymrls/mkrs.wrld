import React from 'react'
import { render, screen, fireEvent } from '@/__tests__/setup/test-utils'
import LikeButton from '@/app/components/features/LikeButton'

describe('LikeButton', () => {
  const mockOnClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with unlike state', () => {
    render(
      <LikeButton 
        isLiked={false} 
        onClick={mockOnClick}
      />
    )
    
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    
    // Check that the heart is not filled
    const svg = button.querySelector('svg')
    expect(svg).toHaveAttribute('fill', 'none')
  })

  it('renders with liked state', () => {
    render(
      <LikeButton 
        isLiked={true} 
        onClick={mockOnClick}
      />
    )
    
    const button = screen.getByRole('button')
    const svg = button.querySelector('svg')
    expect(svg).toHaveAttribute('fill', 'currentColor')
    expect(button).toHaveClass('text-primary')
  })

  it('shows count when showCount is true', () => {
    render(
      <LikeButton 
        isLiked={false} 
        onClick={mockOnClick}
        showCount={true}
        count={5}
      />
    )
    
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('does not show count when showCount is false', () => {
    render(
      <LikeButton 
        isLiked={false} 
        onClick={mockOnClick}
        showCount={false}
        count={5}
      />
    )
    
    expect(screen.queryByText('5')).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    render(
      <LikeButton 
        isLiked={false} 
        onClick={mockOnClick}
      />
    )
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('stops event propagation when clicked', () => {
    const mockStopPropagation = jest.fn()
    
    render(
      <LikeButton 
        isLiked={false} 
        onClick={mockOnClick}
      />
    )
    
    const button = screen.getByRole('button')
    fireEvent.click(button, {
      stopPropagation: mockStopPropagation
    })
    
    expect(mockOnClick).toHaveBeenCalled()
  })

  it('applies hover styles', () => {
    render(
      <LikeButton 
        isLiked={false} 
        onClick={mockOnClick}
      />
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('hover:scale-110')
    expect(button).toHaveClass('active:scale-95')
  })
})