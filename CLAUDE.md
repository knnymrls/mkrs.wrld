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

Note: The chatbot now uses a dual-agent system with intelligent retrieval and response generation. Make sure OPENAI_API_KEY is set (without NEXT_PUBLIC_ prefix) for API routes.

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
│   │   └── [sessionId]/ # Dynamic session routes
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
│   │   ├── route.ts    # Main chat endpoint
│   │   ├── agents/     # Retrieval and Response agents
│   │   ├── strategies/ # Search strategies (semantic, keyword, graph)
│   │   ├── sessions/   # Session management
│   │   ├── stream/     # Streaming chat endpoint
│   │   └── utils/      # Query parser, entity expander
│   └── embeddings/     # Embedding generation
├── components/         # React components
│   ├── layout/         # Layout components (Navbar)
│   ├── features/       # Feature-specific components (AuthorLink, etc.)
│   └── ui/            # Reusable UI components (MentionInput, SourceCard, etc.)
├── context/           # React contexts (AuthContext)
├── models/            # TypeScript interfaces for data models
│   ├── Post.ts        # Post, PostImage, PostProject, PostMention
│   ├── Search.ts      # SearchResult, SearchResults, Source
│   └── ...            # Other data models
├── types/             # Other TypeScript type definitions
│   ├── mention.ts     # Mention-related types
│   ├── chat.ts        # Chat strategy and plan types
│   └── props.ts       # Component prop interfaces
├── lib/               # Business logic and utilities
│   ├── embeddings/    # Embedding utilities
│   │   ├── index.ts   # Main embedding functions
│   │   └── profile-embeddings.ts # Profile-specific embeddings
│   ├── mentions/      # Mention utilities
│   └── supabase/      # Supabase client and storage
│       ├── client.ts  # Supabase client
│       └── storage.ts # Storage utilities
└── public/
    └── images/        # Static images
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

### 2. AI-Powered Universal Information Retrieval
- **Dual-Agent System**: 
  - Retrieval Agent: Universal query understanding, executes optimized search strategies
  - Response Agent: Synthesizes intelligent responses even with no results
- **Optimized Search Strategies**:
  - Fast semantic search using OpenAI embeddings (primary strategy)
  - Pattern-based keyword expansion (no AI calls for speed)
  - Limited graph traversal (depth 1, only when needed)
- **Universal Query Understanding**:
  - Dynamic intent detection (analytical, temporal, exploratory, specific)
  - Flexible entity extraction for any domain
  - Temporal query support ("last week", "past month", "recently")
- **Smart Response System**: 
  - No hardcoded knowledge about specific data
  - Intelligent follow-up questions based on query structure
  - Helpful suggestions when no results found
  - Shows source attribution with clickable cards
- **Performance Optimizations**:
  - ~2-3 second response time (down from 15+ seconds)
  - Animated loading states with progress messages
  - Conditional processing to skip expensive operations

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

### 1. Enhanced Conversational Memory & Context
- **Session-based Context**: Track conversation history for better follow-ups
- **Pronoun Resolution**: Understand "she", "he", "they" from previous messages
- **Query Refinement**: Learn from user's clarifications

### 2. Streamlined Onboarding & Discovery
- **Quick Profile Import**: Import profile data from LinkedIn/GitHub
- **Interactive Tour**: Guided walkthrough of platform features
- **Starter Prompts**: Pre-written queries to help new users discover value quickly
- **Profile Templates**: Role-based templates (engineer, designer, PM) for faster setup
- **AI-Assisted Bio Writing**: Generate professional bio from minimal input

### 3. Smart Notifications System
- **Mention Alerts**: Real-time notifications when someone mentions you or your projects
- **Expertise Matching**: "Someone just asked about [your skill]" notifications
- **Activity Digests**: Weekly summary of relevant activity in your network
- **Configurable Preferences**: Control notification frequency and types

### 4. Advanced Analytics Queries
- **Aggregation Support**: "How many people know React?"
- **Trend Analysis**: "What skills are growing in popularity?"
- **Comparison Queries**: "Compare frontend vs backend expertise"
- **Distribution Queries**: "Show skill distribution by department"

### 5. Real-time Collaboration Features
- **Live Activity Streams**: See what's happening in real-time
- **Collaborative Search**: Share search results with team members
- **Expert Recommendations**: AI suggests who to connect with based on current work

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

## Recent Structural Changes (Last Updated: January 2025)

### Code Organization Improvements
- **Component Reorganization**: 
  - Kept `MentionInput` in ui/ (reusable component with better implementation)
  - Kept `AuthorLink` in features/ (feature-specific)
  - Removed duplicate versions of both components
- **Type Definition Organization**:
  - Consolidated duplicate Post models (removed Posts.ts)
  - Created `app/types/props.ts` for component prop interfaces
  - Split `api/chat/types.ts` into `models/Search.ts` and `types/chat.ts`
- **Library Structure**:
  - Organized lib/ files into subdirectories (embeddings/, supabase/)
  - Updated all imports to use new paths
- **Dead Code Removal** (Completed January 2025):
  - Removed unused components: ImageCropModal.tsx, MentionText.tsx, PostGrid.tsx
  - Removed duplicate components: ui/AuthorLink.tsx, features/MentionInput.tsx
  - Removed unused model: Posts.ts
  - Removed unused PostGridProps interface
  - No console.log statements found in application code (only in scripts)
- **Performance Optimizations** (Completed January 2025):
  - Added React.memo to frequently re-rendering components
  - Optimized PostCard with useMemo and useCallback
  - Consolidated 3 Supabase real-time channels into 1 channel
  - Reduced WebSocket connections from 3 to 1 for activity feed

### Import Path Standards
- All imports now use absolute paths with `@/` prefix
- Organized imports follow this pattern:
  - `@/app/models/` for data model interfaces
  - `@/app/types/` for other type definitions
  - `@/lib/` for utilities and business logic
  - `@/app/components/` for React components

## Known Issues to Investigate

### Current Architecture Notes

#### Chatbot Implementation
- **Universal Query Support**: Handles any type of question about the data
- **No Hardcoded Knowledge**: System discovers available data dynamically
- **Optimized for Speed**: ~2-3 second response time with loading animations
- **Pattern-based Expansion**: Fast term expansion without AI API calls

#### Performance Considerations
- Reduced search result limits (50 → 30) for faster queries
- Skip graph traversal for time-based queries
- Limited expansion searches to essential cases only
- Removed expensive AI calls for term generation
- idk

#### pgvector Issue (Resolved)
- Fixed embedding dimensions from 19,000+ to proper 1536
- Embeddings now stored correctly using text-embedding-3-small
- Semantic search functioning properly with cosine similarity