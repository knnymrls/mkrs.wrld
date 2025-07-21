# Multi-Community Architecture Design for Nural

## Overview
Transform Nural from a single-tenant application to a multi-community platform where organizations can create and manage their own isolated knowledge discovery spaces.

## Database Schema Changes

### New Tables

#### 1. `communities`
```sql
CREATE TABLE communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}', -- Community-specific settings
  is_public BOOLEAN DEFAULT false, -- Whether community is discoverable
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Index for slug lookups
CREATE INDEX idx_communities_slug ON communities(slug);
```

#### 2. `community_members`
```sql
CREATE TABLE community_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- member, moderator, admin, owner
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(community_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_community_members_user ON community_members(user_id);
CREATE INDEX idx_community_members_community ON community_members(community_id);
```

#### 3. `community_invitations`
```sql
CREATE TABLE community_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
```

### Modified Tables
Add `community_id` to all content tables:

```sql
-- Add community_id to existing tables
ALTER TABLE profiles ADD COLUMN community_id UUID REFERENCES communities(id);
ALTER TABLE posts ADD COLUMN community_id UUID REFERENCES communities(id);
ALTER TABLE projects ADD COLUMN community_id UUID REFERENCES communities(id);
ALTER TABLE project_requests ADD COLUMN community_id UUID REFERENCES communities(id);
ALTER TABLE chat_sessions ADD COLUMN community_id UUID REFERENCES communities(id);

-- Create indexes for community filtering
CREATE INDEX idx_profiles_community ON profiles(community_id);
CREATE INDEX idx_posts_community ON posts(community_id);
CREATE INDEX idx_projects_community ON projects(community_id);
CREATE INDEX idx_project_requests_community ON project_requests(community_id);
CREATE INDEX idx_chat_sessions_community ON chat_sessions(community_id);
```

## URL Structure

### Before (Single Community)
```
/                           # Home/Activity Feed
/profile/[id]              # View Profile
/projects                  # Projects List
/chatbot                   # AI Chat
```

### After (Multi-Community)
```
/                           # Landing page / Community selector
/communities               # Browse public communities
/communities/new           # Create new community
/[community]/              # Community home
/[community]/profile/[id]  # View profile in community
/[community]/projects      # Community projects
/[community]/chatbot       # Community-scoped AI chat
/[community]/settings      # Community settings (admin only)
/[community]/members       # Community members (admin only)
```

## Implementation Phases

### Phase 1: Database Foundation
1. Create new tables (communities, community_members, community_invitations)
2. Add community_id to existing tables
3. Create migration to move existing data to a "default" community
4. Update RLS policies for community isolation

### Phase 2: Routing & Middleware
1. Create middleware to extract community from URL
2. Update Next.js routing structure with [community] dynamic segment
3. Create CommunityContext to provide current community throughout app
4. Update all internal links to include community slug

### Phase 3: Core Features
1. Community creation flow
2. Community member management
3. Invitation system
4. Community switcher UI component
5. Update authentication flow to handle community selection

### Phase 4: Update Existing Features
1. Scope all queries by community_id
2. Update search/embeddings to be community-specific
3. Update chat to only access community data
4. Update notifications to be community-scoped

### Phase 5: Community Management
1. Community settings page
2. Member roles and permissions
3. Community analytics/insights
4. Community deletion/archival

## Key Components to Create

### 1. `CommunityProvider` (Context)
```typescript
interface CommunityContextType {
  currentCommunity: Community | null;
  userCommunities: Community[];
  switchCommunity: (slug: string) => Promise<void>;
  createCommunity: (data: CreateCommunityData) => Promise<Community>;
  joinCommunity: (inviteToken: string) => Promise<void>;
}
```

### 2. `CommunitySelector` Component
- Dropdown to switch between communities
- "Create new community" option
- Show user's role in each community

### 3. `CommunityGuard` Component
- Verify user has access to current community
- Redirect to community selector if not

### 4. Community Management Pages
- `/[community]/settings` - General settings
- `/[community]/members` - Member management
- `/[community]/invitations` - Pending invitations

## Security Considerations

### Row Level Security (RLS)
```sql
-- Example RLS policy for posts
CREATE POLICY "Users can only see posts in their communities"
  ON posts
  FOR SELECT
  USING (
    community_id IN (
      SELECT community_id 
      FROM community_members 
      WHERE user_id = auth.uid()
    )
  );
```

### Permission Checks
- Only community admins can modify settings
- Only admins/moderators can invite new members
- Owner role cannot be removed/demoted
- Members can only see content within their communities

## Migration Strategy

### Step 1: Create Default Community
```sql
INSERT INTO communities (slug, name, description)
VALUES ('default', 'Original Community', 'The original Nural community');
```

### Step 2: Migrate Existing Data
```sql
-- Add all existing users to default community
INSERT INTO community_members (community_id, user_id, role)
SELECT 
  (SELECT id FROM communities WHERE slug = 'default'),
  id,
  'member'
FROM auth.users;

-- Update all content with default community
UPDATE profiles SET community_id = (SELECT id FROM communities WHERE slug = 'default');
UPDATE posts SET community_id = (SELECT id FROM communities WHERE slug = 'default');
-- ... repeat for all tables
```

### Step 3: Deploy with Feature Flag
- Use feature flag to gradually roll out multi-community features
- Initially, all users stay in default community
- Enable community creation for select users
- Eventually enable for all users

## Benefits

1. **Complete Isolation**: Each community has its own data, search index, and knowledge graph
2. **Scalability**: Can host unlimited communities on same infrastructure
3. **Flexibility**: Communities can have different settings, themes, features
4. **Privacy**: Data never leaks between communities
5. **Multi-tenancy**: True SaaS model with organization-level billing possible

## Challenges to Consider

1. **URL Changes**: All existing links will break unless redirects are implemented
2. **Search Complexity**: Need to rebuild search indices per community
3. **Performance**: May need to optimize queries with community_id filtering
4. **User Experience**: Need smooth community switching without losing context
5. **Data Migration**: Careful planning needed to avoid data loss

## Next Steps

1. Review and approve this design
2. Create detailed technical specifications for each phase
3. Set up development branch for multi-community work
4. Begin with Phase 1 (database changes)
5. Implement incrementally with thorough testing at each phase