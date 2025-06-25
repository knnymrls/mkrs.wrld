# AI Assistant API Documentation

## Overview

The AI Assistant API provides intelligent, context-aware suggestions based on entities in the knowledge graph (profiles, posts, and projects). It performs deep graph traversal to generate rich insights and actionable suggestions.

## API Endpoint

### Analyze Context

**Endpoint:** `POST /api/ai-assistant/analyze`

**Description:** Analyzes the provided context and returns relevant suggestions based on graph traversal and entity relationships.

### Request Format

```json
{
  "context": {
    "type": "profile" | "post" | "project" | null,
    "id": "string | null",
    "content": "string | null",
    "metadata": {
      // Optional additional context
    }
  },
  "userId": "string (optional)"
}
```

### Response Format

```json
{
  "suggestions": [
    {
      "id": "string",
      "type": "connection" | "similarity" | "trend" | "insight",
      "title": "string",
      "description": "string",
      "action": {
        "label": "string",
        "href": "string (optional)",
        "onClick": "function (optional)"
      }
    }
  ]
}
```

## Entity-Specific Behaviors

### Profile Context

When analyzing a profile, the API:
- Fetches the person's recent posts and activity
- Identifies projects they contribute to
- Finds frequently collaborating colleagues
- Extracts active discussion topics
- Calculates engagement statistics

**Example Suggestions:**
- "Works on 3 projects" with links to view them
- "Active in discussions about [topics]"
- "Frequently works with [names]"
- Activity overview with post/project/skill counts

### Post Context

When analyzing a post, the API:
- Identifies mentioned people and projects
- Finds similar posts by the same author
- Locates related discussions mentioning the same entities
- Provides author context

**Example Suggestions:**
- "Mentions [names]" with profile links
- "5 related discussions" across the organization
- "[Author] has 12 other posts"
- "Related to projects: [project names]"

### Project Context

When analyzing a project, the API:
- Retrieves the full team and their roles
- Finds recent posts about the project
- Identifies key contributors (leads/owners)
- Checks project status and activity levels

**Example Suggestions:**
- "8 team members" with team viewer link
- "15 recent updates" showing project momentum
- "Status: active" indicator
- "Interested in contributing?" for non-members

## Testing the API

### 1. Using the Test Endpoint

Visit `http://localhost:3000/api/ai-assistant/test` to run automated tests.

### 2. Using the Test Scripts

```bash
# JavaScript test (with real Supabase data)
node scripts/test-ai-assistant.js

# Shell script test (with mock data)
./scripts/test-ai-assistant.sh
```

### 3. Manual Testing with cURL

```bash
# Test profile context
curl -X POST http://localhost:3000/api/ai-assistant/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "type": "profile",
      "id": "12345678-1234-1234-1234-123456789012",
      "content": "John Doe"
    }
  }'

# Test post context
curl -X POST http://localhost:3000/api/ai-assistant/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "type": "post",
      "id": "87654321-4321-4321-4321-210987654321",
      "content": "Working on AI features..."
    }
  }'

# Test project context with userId
curl -X POST http://localhost:3000/api/ai-assistant/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "type": "project",
      "id": "11111111-2222-3333-4444-555555555555",
      "content": "Knowledge Graph AI"
    },
    "userId": "current-user-id"
  }'
```

## Performance Characteristics

- **Average Response Time:** 50-200ms (depending on entity complexity)
- **Graph Traversal Depth:** Limited to prevent excessive queries
- **Caching:** Not currently implemented (future enhancement)

## Error Handling

The API handles various error cases:
- Missing or invalid context returns empty suggestions
- Database errors are caught and logged
- Malformed requests return 400 status
- Server errors return 500 status with error message

## Future Enhancements

1. **Caching Layer:** Cache suggestions for frequently accessed entities
2. **Personalization:** Tailor suggestions based on user's role and history
3. **Real-time Updates:** Use WebSockets for live suggestion updates
4. **ML-based Ranking:** Score suggestions by relevance
5. **Batch Processing:** Support multiple contexts in one request