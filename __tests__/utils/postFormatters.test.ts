import { formatPost } from '@/app/(main)/utils/postFormatters'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Mock the Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
}))

describe('formatPost', () => {
  const mockSupabase = createClientComponentClient()
  const mockUser = { id: 'user-123' } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('formats post with nested author data', async () => {
    const postData = {
      id: 'post-1',
      content: 'Test post',
      created_at: '2024-01-01T00:00:00Z',
      author_id: 'author-1',
      profiles: {
        id: 'author-1',
        name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
      },
      post_mentions: [],
      post_projects: [],
      post_likes: [],
      post_comments: [],
      post_images: [],
    }

    const result = await formatPost(postData, mockUser)

    expect(result).toEqual({
      id: 'post-1',
      content: 'Test post',
      created_at: '2024-01-01T00:00:00Z',
      author: {
        id: 'author-1',
        name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
      },
      mentions: [],
      likes_count: 0,
      comments_count: 0,
      user_has_liked: false,
      image_url: undefined,
      image_width: undefined,
      image_height: undefined,
      images: [],
    })
  })

  it('handles mentions correctly', async () => {
    const postData = {
      id: 'post-1',
      content: 'Test post',
      created_at: '2024-01-01T00:00:00Z',
      author_id: 'author-1',
      post_mentions: [
        {
          profile_id: 'user-2',
          profiles: {
            id: 'user-2',
            name: 'Jane Smith',
            avatar_url: 'https://example.com/jane.jpg',
          },
        },
      ],
      post_projects: [
        {
          project_id: 'project-1',
          projects: {
            id: 'project-1',
            title: 'Test Project',
            image_url: null,
          },
        },
      ],
      post_likes: [],
      post_comments: [],
      post_images: [],
    }

    const result = await formatPost(postData, mockUser)

    expect(result.mentions).toEqual([
      {
        id: 'user-2',
        name: 'Jane Smith',
        type: 'person',
        imageUrl: 'https://example.com/jane.jpg',
      },
      {
        id: 'project-1',
        name: 'Test Project',
        type: 'project',
        imageUrl: null,
      },
    ])
  })

  it('calculates likes correctly with user like status', async () => {
    const postData = {
      id: 'post-1',
      content: 'Test post',
      created_at: '2024-01-01T00:00:00Z',
      author_id: 'author-1',
      post_likes: [
        { user_id: 'user-123' }, // Current user
        { user_id: 'user-456' },
        { user_id: 'user-789' },
      ],
      post_mentions: [],
      post_projects: [],
      post_comments: [],
      post_images: [],
    }

    const result = await formatPost(postData, mockUser)

    expect(result.likes_count).toBe(3)
    expect(result.user_has_liked).toBe(true)
  })

  it('fetches mentions when not included in post data', async () => {
    const postData = {
      id: 'post-1',
      content: 'Test post',
      created_at: '2024-01-01T00:00:00Z',
      author_id: 'author-1',
    }

    // Mock the select queries for mentions
    const mockFrom = jest.fn((table: string) => {
      if (table === 'post_mentions') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [
                {
                  profiles: {
                    id: 'user-2',
                    name: 'Fetched User',
                    avatar_url: null,
                  },
                },
              ],
              error: null,
            }))
          }))
        }
      }
      if (table === 'post_projects') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [],
              error: null,
            }))
          }))
        }
      }
      if (table === 'post_likes') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }
      }
      // Default for count queries
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ count: 0, error: null }))
        }))
      }
    })

    // Need to recreate the mock client
    ;(createClientComponentClient as jest.Mock).mockReturnValue({
      from: mockFrom
    })

    const result = await formatPost(postData, mockUser)

    expect(result.mentions).toHaveLength(1)
    expect(result.mentions[0]).toEqual({
      id: 'user-2',
      name: 'Fetched User',
      type: 'person',
      imageUrl: null,
    })
  })

  it('sorts images by position', async () => {
    const postData = {
      id: 'post-1',
      content: 'Test post',
      created_at: '2024-01-01T00:00:00Z',
      author_id: 'author-1',
      post_images: [
        { id: 'img-3', url: 'url3', width: 300, height: 300, position: 2 },
        { id: 'img-1', url: 'url1', width: 100, height: 100, position: 0 },
        { id: 'img-2', url: 'url2', width: 200, height: 200, position: 1 },
      ],
      post_mentions: [],
      post_projects: [],
      post_likes: [],
      post_comments: [],
    }

    const result = await formatPost(postData, mockUser)

    expect(result.images).toEqual([
      { id: 'img-1', url: 'url1', width: 100, height: 100, position: 0 },
      { id: 'img-2', url: 'url2', width: 200, height: 200, position: 1 },
      { id: 'img-3', url: 'url3', width: 300, height: 300, position: 2 },
    ])
  })

  it('handles missing author data with fallback', async () => {
    const postData = {
      id: 'post-1',
      content: 'Test post',
      created_at: '2024-01-01T00:00:00Z',
      author_id: 'author-1',
      profiles: null,
      post_mentions: [],
      post_projects: [],
      post_likes: [],
      post_comments: [],
      post_images: [],
    }

    const result = await formatPost(postData, mockUser)

    expect(result.author).toEqual({
      id: 'author-1',
      name: 'Unknown',
      avatar_url: null,
    })
  })
})