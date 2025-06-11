# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Working Process
**ALWAYS draft a plan and ask the user if it looks right BEFORE starting to code.** This ensures alignment with user expectations and prevents wasted effort.

## Development Guidelines

### Code Organization
- **Component Structure**: Place reusable UI components in `app/components/ui/`, feature-specific components in `app/components/features/`
- **Shared Logic**: Business logic and utilities go in `lib/` directory
- **Type Definitions**: Keep interfaces in `app/models/` for data models, `app/types/` for other types
- **API Routes**: Organize by feature in `app/api/` (e.g., `api/chat/`, `api/search/`)

### Making Changes
- **Feature Additions**: Create new components in appropriate directories, don't modify existing ones unless necessary
- **Refactoring**: Update imports across all affected files when moving components
- **State Management**: Use React hooks for local state, Context API for global state
- **Database Changes**: Document schema changes in migration files

### Best Practices
- **Component Reusability**: When implementing a feature that might be used in multiple places:
  - First check if similar functionality exists elsewhere in the codebase
  - Extract shared logic into reusable components/utilities
  - Place UI components in `components/ui/` or `components/features/`
  - Create utilities in `lib/` for business logic
  - Example: If adding mentions to chatbot and it exists in posts, extract a shared `MentionInput` component
- **DRY Principle**: Don't duplicate complex logic - if you find yourself copying code, refactor it into a shared module
- **Naming Conventions**: 
  - Components: PascalCase (e.g., `MentionDropdown.tsx`)
  - Utilities: camelCase (e.g., `searchMentions.ts`)
  - Types/Interfaces: PascalCase with descriptive names
- **File Organization**: Keep files focused - one component per file, extract complex logic to separate functions
- **Imports**: Use absolute imports (`@/lib/...`) for better maintainability
- **Comments**: Add comments only for complex logic, let code be self-documenting otherwise

## Project Overview

Nural-app is an enterprise knowledge discovery tool designed to uncover hidden pockets of expertise within large organizations. It uses AI-powered semantic search and graph-based retrieval to help employees find colleagues with specific skills, discover who's worked on similar problems, and understand what teams are working on in real-time.

**Core Problem**: Large organizations have vast amounts of untapped knowledge and expertise that remains siloed and undiscoverable, leading to duplicated efforts and missed collaboration opportunities.

**Solution**: A social activity feed with AI-powered discovery features, including:
- Inline post creation with @mentions for people and projects
- Graph-based RAG (Retrieval Augmented Generation) chatbot
- Interactive knowledge graph visualization
- Comprehensive profile and project pages

**Current Status**: MVP fully implemented with enhanced features. Recent updates include inline post creation with mentions, improved graph-based retrieval, and better routing structure.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint
```

## Architecture

### Tech Stack
- **Next.js 15.3.3** with App Router
- **TypeScript** with strict mode
- **Supabase** for auth and PostgreSQL database
- **OpenAI API** for embeddings (text-embedding-3-small) and chat (gpt-4o-mini)
- **Tailwind CSS v4** for styling
- **react-force-graph** for graph visualization

### Key Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

### Database Schema

Core tables:
- **profiles**: User profiles with embedding vectors (id, name, email, bio, location, title, embedding[], created_at, updated_at)
- **skills**: Individual skills linked to profiles (id, profile_id, skill, created_at)
- **posts**: User posts with embeddings (id, author_id, content, embedding[], created_at, updated_at)
- **educations**: Educational background (id, profile_id, school, degree, year, created_at)
- **experiences**: Work experience (id, profile_id, company, role, start_date, end_date, description, created_at)
- **projects**: Projects with embeddings (id, title, description, status, created_by, embedding[], created_at, updated_at)
- **contributions**: Links people to projects (id, person_id, project_id, role, start_date, end_date, description, created_at)

Junction tables:
- **post_projects**: Links posts to projects they mention (post_id, project_id, created_at)
- **post_mentions**: Links posts to profiles they mention (post_id, profile_id, created_at)

RPC functions:
- `match_posts`: Semantic search on posts
- `match_profiles`: Semantic search on profiles
- `match_projects`: Semantic search on projects

## Project Structure

### Directory Layout
```
app/
├── (auth)/               # Authentication routes (no navbar)
│   └── auth/
│       ├── signin/
│       ├── signup/
│       └── verify-email/
├── (main)/              # Main app routes (with navbar)
│   ├── layout.tsx       # Layout with Navbar
│   ├── page.tsx         # Home/Activity feed
│   ├── chatbot/         # AI chatbot
│   ├── graph/           # Knowledge graph visualization
│   ├── onboarding/      # Profile setup
│   ├── profile/         # Profile management
│   │   ├── [id]/        # View other profiles
│   │   ├── education/new/
│   │   └── experience/new/
│   └── projects/        # Project management
│       ├── [id]/        # Project details
│       └── new/         # Create project
├── api/                 # API routes
│   ├── chat/           # AI chat endpoint
│   ├── embeddings/     # Embedding generation
│   └── search/         # Search endpoints
├── components/         # React components
│   ├── layout/         # Layout components (Navbar)
│   ├── features/       # Feature-specific components
│   └── ui/            # Reusable UI components
├── context/           # React contexts
├── models/            # TypeScript interfaces
├── hooks/             # Custom React hooks
├── types/             # Type definitions
└── utils/             # Utility functions
```

## Key Features

### 1. Activity Feed (Home Page)
- **Inline Post Creation**: Click "What's on your mind?" to create posts
- **Smart @Mentions**: 
  - Type @ to trigger mention dropdown
  - After selection, @ disappears and only the name remains
  - If @ is deleted before selection, dropdown closes
  - Supports spaces in names
  - Arrow key navigation and Enter selection
  - Single backspace deletes entire mention
  - Mentions appear with subtle underline
  - Create new projects on-the-fly if no match exists
- **Rich Post Display**: Mentions render as clickable links without @ symbol

### 2. AI-Powered Discovery
- **Graph-Based RAG**: Searches across posts, profiles, AND projects
- **Multi-hop Queries**: Discovers indirect connections
- **Contextual Understanding**: Maintains conversation history
- **Semantic Search**: Uses OpenAI embeddings for intelligent matching
- **Mention Support**: Chatbot accepts @mentions for specific context

### 3. Knowledge Graph Visualization
- **Interactive Graph**: D3-based force-directed graph
- **Entity Types**: Shows people, posts, and their connections
- **Click Navigation**: Click nodes to view details

### 4. Profile System
- **Comprehensive Profiles**: Name, title, location, bio, skills
- **Education & Experience**: Track background and work history
- **Social Links**: Add GitHub, LinkedIn, etc.
- **Activity Timeline**: View user's posts and contributions

### 5. Project Management
- **Project Pages**: Detailed project information
- **Contributors**: Track who's working on what with roles
- **Status Tracking**: Active, paused, or complete
- **Automatic Linking**: Posts mentioning projects are connected

## Implementation Details

### Authentication & Onboarding
- **Supabase Auth**: Handles user registration/login
- **Auto Profile Creation**: Database trigger creates profile on signup
- **Required Onboarding**: Users must complete profile (name, title, location, bio, skills)
- **Optional Details**: Education and experience can be added later

### Embeddings & Search
- **OpenAI Integration**: Uses text-embedding-3-small model (1536 dimensions)
- **Embedded Content**:
  - Profiles: Combines bio, skills, title, location, education, and experience
  - Projects: Title and description
  - Posts: Full content including mentions
- **Semantic Search**: pgvector extension for similarity matching
- **Multi-Entity Search**: Simultaneous search across posts, profiles, and projects

### Database Relationships
- **Posts → Profiles**: `author_id` links to post creator
- **Posts → Mentions**: Junction tables track @mentions
  - `post_mentions`: Links posts to mentioned profiles
  - `post_projects`: Links posts to mentioned projects
- **Projects → Contributors**: `contributions` table with roles and dates
- **Profiles → Skills/Education/Experience**: One-to-many relationships

### Real-time Features
- **Activity Feed**: Shows latest posts with mentions
- **Mention Autocomplete**: Real-time search as user types @
- **Graph Updates**: Dynamic visualization of connections

## Future Enhancements

### 1. Intelligent Natural Language Discovery
A comprehensive enhancement that combines natural language understanding, multi-hop discovery, and conversational intelligence into one powerful system.

#### Core Capabilities:
- **Natural Language Understanding**: Ask anything in plain English
  - "Who has experience working with React?" → Searches skills, posts, and project descriptions
  - "Which employees went to Stanford?" → Queries education records
  - "Who has a Master's degree in Computer Science?" → Filters by degree type and field
  - "Show me people who've worked at Google" → Searches experience history
  - "Find React developers in New York who've worked on e-commerce" → Multi-attribute search

- **Temporal/Recency Queries**: Search with time constraints
  - "Who's worked on machine learning projects in the last month?"
  - "Show me recent posts about AWS from this week"
  - "Which projects were completed in Q4?"
  - "Who mentioned Kubernetes in the past 2 weeks?"

- **Multi-Hop Discovery**: Find indirect connections
  - "Who knows someone who has worked with blockchain?"
  - "Find people 2 degrees away from me who know Python"
  - "Which teams have members who've collaborated with the DevOps team?"

- **Conversational Memory**: Maintain context across messages
  - User: "Who knows React?" → Bot: "Sarah and Mike"
  - User: "What has she worked on recently?" → Bot understands "she" = Sarah
  - User: "And him?" → Bot understands "him" = Mike

#### Implementation Steps:
1. **Query Parser Development**
   - Build NLP pipeline to extract entities (skills, timeframes, locations, degrees)
   - Create query intent classifier (search for people, projects, or posts)
   - Develop temporal expression parser ("last month", "this week", "past 2 weeks")

2. **Enhanced Embedding System**
   - Generate embeddings for partial queries and synonyms
   - Create concept maps (React → Frontend, AWS → Cloud)
   - Add timestamp metadata to all embeddings

3. **Graph Traversal Engine**
   - Implement breadth-first search for multi-hop queries
   - Add path-finding algorithms for connection discovery
   - Create relevance scoring based on path length and recency

4. **Conversation State Manager**
   - Store conversation context per session
   - Track mentioned entities for pronoun resolution
   - Build query refinement based on previous questions

5. **Result Ranking System**
   - Score results by relevance, recency, and connection strength
   - Implement diversity sampling to show varied results
   - Add explanation generation ("Found via: Sarah worked on Project X which mentioned React")

### 2. Graph-Powered Analytics & Insights
Transform the existing graph visualization into a comprehensive analytics platform.

#### Enhanced Graph Features:
- **Interactive Filtering**
  - Time-based filters: "Show connections from last 30 days"
  - Entity type filters: "Show only people and projects"
  - Skill-based clustering: "Group by expertise areas"

- **Visual Analytics**
  - Node size based on activity level or expertise depth
  - Edge thickness showing collaboration frequency
  - Color coding for departments, skills, or project status
  - Heat zones showing knowledge concentration

- **Discovery Patterns**
  - Highlight knowledge silos (disconnected clusters)
  - Show collaboration opportunities (potential connections)
  - Identify key connectors (people who bridge teams)
  - Surface trending topics (growing node clusters)

- **Interactive Insights**
  - Click a skill node: See everyone who knows it and their connections
  - Select two people: Show shortest path between them
  - Time scrubber: Watch the graph evolve over time
  - Zoom into team view: See internal team dynamics

- **Actionable Intelligence**
  - "These two teams have similar projects but haven't connected"
  - "This person is the only link between frontend and backend teams"
  - "This expertise area is growing rapidly across the organization"

## Key Use Cases

1. **Expertise Discovery**: "Who knows Kubernetes?" → Returns people with relevant skills, recent posts mentioning it, and related projects
2. **Team Formation**: "Who would be good for a React project?" → Identifies available people with React experience
3. **Knowledge Sharing**: "Has anyone worked on OAuth integration?" → Surfaces past solutions and knowledgeable colleagues
4. **Activity Tracking**: "What has the intern team accomplished this week?" → Aggregates recent posts and project updates
5. **Cross-team Collaboration**: Discovers people working on similar problems across different departments

## Technical Considerations

### Performance Optimizations
- **Batch Operations**: Multiple tool calls in parallel for better performance
- **Deduplication**: Prevents duplicate mentions in junction tables
- **Indexed Searches**: pgvector indexes for fast similarity matching
- **Component Memoization**: React optimization for large lists

### State Management
- **AuthContext**: Global authentication state
- **Local State**: Component-level state for UI interactions
- **Tracked Mentions**: Maintains mention positions during editing
- **Session Storage**: Chat history persisted per session

### Error Handling
- **Graceful Degradation**: Features work even if some data missing
- **User Feedback**: Clear error messages and loading states
- **Retry Logic**: Automatic retries for failed API calls
- **Validation**: Input validation before database operations

## Known Issues to Investigate

### pgvector Negative Similarity Scores
**Issue**: When using Supabase's pgvector extension for semantic search, all similarity scores are returning negative values (around -0.03) instead of the expected positive values between 0 and 1. This forces us to use a threshold of -1 instead of proper similarity thresholds like 0.5.

**Current Workaround**: Using `match_threshold: -1` in all RPC function calls to ensure results are returned.

**Investigation Needed**:
1. Research why pgvector's cosine similarity calculation (`1 - (embedding <=> query_embedding)`) is returning negative values
2. Check if this is related to:
   - Supabase's specific pgvector implementation or version
   - The way embeddings are stored/retrieved through Supabase's JavaScript client
   - Vector normalization issues between OpenAI's text-embedding-3-small model and pgvector
   - A configuration issue with the vector column type in PostgreSQL
3. Determine if other Supabase users have experienced similar issues
4. Find the proper solution to get similarity scores in the expected 0-1 range

**Technical Details**:
- Using OpenAI's text-embedding-3-small model (1536 dimensions)
- Embeddings are confirmed to be normalized (magnitude ≈ 1)
- Embeddings are stored as `vector(1536)` type in PostgreSQL
- The RPC functions use standard pgvector similarity: `1 - (embedding <=> query_embedding)`
- Both direct similarity queries and searches return negative values