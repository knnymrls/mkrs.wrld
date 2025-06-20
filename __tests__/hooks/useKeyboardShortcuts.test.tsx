import { renderHook } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { useKeyboardShortcuts } from '@/app/(main)/hooks/useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  let onEscapeMock: jest.Mock
  let onCreatePostMock: jest.Mock

  beforeEach(() => {
    onEscapeMock = jest.fn()
    onCreatePostMock = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('calls onEscape when Escape key is pressed', () => {
    renderHook(() => useKeyboardShortcuts({
      onEscape: onEscapeMock,
      onCreatePost: onCreatePostMock,
    }))

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onEscapeMock).toHaveBeenCalledTimes(1)
    expect(onCreatePostMock).not.toHaveBeenCalled()
  })

  it('calls onCreatePost when Cmd+Shift+P is pressed (Mac)', () => {
    renderHook(() => useKeyboardShortcuts({
      onEscape: onEscapeMock,
      onCreatePost: onCreatePostMock,
    }))

    fireEvent.keyDown(window, { 
      key: 'P', 
      shiftKey: true, 
      metaKey: true 
    })

    expect(onCreatePostMock).toHaveBeenCalledTimes(1)
    expect(onEscapeMock).not.toHaveBeenCalled()
  })

  it('calls onCreatePost when Ctrl+Shift+P is pressed (Windows/Linux)', () => {
    renderHook(() => useKeyboardShortcuts({
      onEscape: onEscapeMock,
      onCreatePost: onCreatePostMock,
    }))

    fireEvent.keyDown(window, { 
      key: 'P', 
      shiftKey: true, 
      ctrlKey: true 
    })

    expect(onCreatePostMock).toHaveBeenCalledTimes(1)
    expect(onEscapeMock).not.toHaveBeenCalled()
  })

  it('does not call callbacks when different keys are pressed', () => {
    renderHook(() => useKeyboardShortcuts({
      onEscape: onEscapeMock,
      onCreatePost: onCreatePostMock,
    }))

    fireEvent.keyDown(window, { key: 'Enter' })
    fireEvent.keyDown(window, { key: 'A' })
    fireEvent.keyDown(window, { key: 'P' }) // Without modifiers

    expect(onEscapeMock).not.toHaveBeenCalled()
    expect(onCreatePostMock).not.toHaveBeenCalled()
  })

  it('prevents default behavior for create post shortcut', () => {
    const preventDefaultMock = jest.fn()
    
    renderHook(() => useKeyboardShortcuts({
      onEscape: onEscapeMock,
      onCreatePost: onCreatePostMock,
    }))

    const event = new KeyboardEvent('keydown', { 
      key: 'P', 
      shiftKey: true, 
      metaKey: true,
    })
    event.preventDefault = preventDefaultMock

    window.dispatchEvent(event)

    expect(preventDefaultMock).toHaveBeenCalled()
  })

  it('does not call callbacks when they are not provided', () => {
    renderHook(() => useKeyboardShortcuts({}))

    // Should not throw errors
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.keyDown(window, { key: 'P', shiftKey: true, metaKey: true })
  })

  it('removes event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    
    const { unmount } = renderHook(() => useKeyboardShortcuts({
      onEscape: onEscapeMock,
      onCreatePost: onCreatePostMock,
    }))

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})