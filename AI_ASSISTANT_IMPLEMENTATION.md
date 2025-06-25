# AI Assistant Implementation

## Overview
We've implemented an AI-powered command palette and context-aware suggestion system for the Nural platform. The AI Assistant is accessible via a navbar button or keyboard shortcut (Cmd/Ctrl+K) and provides intelligent search, navigation, and discovery features.

## Key Features

### 1. **Smart Command Palette**
- Quick access via navbar button or Cmd/Ctrl+K shortcut
- **Search-First Design**:
  - Real-time search across people, projects, and posts
  - Instant results as you type (300ms debounce)
  - Shows up to 3 results per category
- **Intelligent AI Mode**:
  - Automatically activates when no search results found
  - Provides contextual AI suggestions based on query
  - Direct integration with chatbot - takes you straight to conversation
- **Seamless Flow**: Search → AI suggestions → Quick navigation
- Keyboard navigation (arrow keys + Enter)
- Voice search button for hands-free queries

### 2. **Context-Aware Intelligence**
- Detects when hovering over:
  - Posts (shows related discussions and expert connections)
  - Profiles (displays recent activity and mutual connections)
  - Projects (shows team members and activity trends)
- Real-time analysis via `/api/ai-assistant/analyze` endpoint
- Caches results to prevent redundant API calls

### 3. **Voice-Activated Search**
- "Hey Nural" wake word detection
- Web Speech API integration
- Automatic redirection to chatbot with transcribed query
- Visual feedback during listening

### 4. **Smart Suggestions**
- Different suggestion types:
  - **Connections**: Find people with relevant expertise
  - **Similarities**: Discover related posts and discussions
  - **Trends**: See what's gaining momentum
  - **Insights**: Get activity summaries
- Action buttons for quick navigation

### 5. **User Experience**
- Always accessible via navbar (sparkles icon)
- Keyboard shortcut (Cmd/Ctrl+K) works globally
- Search-as-you-type with instant filtering
- Clear categorization of commands
- Voice search button for hands-free queries
- Responsive design with keyboard hints

## Technical Implementation

### Components Structure
```
app/components/features/AIAssistant/
├── AICommandPalette.tsx   # Main command palette interface
├── ContextTooltip.tsx     # Lightweight context tooltip coordinator
├── ContextDetector.tsx    # Hover detection logic
├── SuggestionBubble.tsx   # Tooltip for suggestions
└── VoiceInterface.tsx     # Voice search modal (legacy)

app/components/layout/
└── Navbar.tsx             # Contains AI button and keyboard handler
```

### Data Flow
1. **ContextDetector** monitors mouse movements
2. Extracts context from data attributes (`data-post-id`, `data-profile-id`, etc.)
3. Sends context to **useAIAssistant** hook
4. Hook calls API endpoint for analysis
5. **SuggestionBubble** displays results near cursor

### API Integration
- **Endpoint**: `/api/ai-assistant/analyze`
- Uses existing semantic search infrastructure
- Analyzes content using QueryParser
- Returns contextual suggestions based on entity type

## Usage

### For Users
1. Press Cmd/Ctrl+K or click the sparkles icon in navbar
2. Start typing to search for people, projects, or posts
3. If no results found, AI suggestions appear automatically
4. Press Enter to select or ask AI your question
5. Hover over posts, profiles, or projects to see AI insights (on homepage)

### For Developers
To add AI Assistant support to new components:

1. Add data attributes to your component:
```tsx
<div data-[type]-id={id} data-[type]-[field]={value}>
  {/* Component content */}
</div>
```

2. Update ContextDetector to recognize the new type:
```tsx
const newTypeElement = element.closest('[data-newtype-id]');
if (newTypeElement) {
  // Extract and return context
}
```

## Configuration

### Adding New Commands
Add commands to the `commands` array in AICommandPalette.tsx:
```tsx
{
  id: 'unique-id',
  title: 'Command Title',
  description: 'Optional description',
  icon: <Icon />,
  action: () => { /* handler */ },
  category: 'ai' | 'navigation' | 'quick'
}
```

### Customize Suggestions
Modify the API endpoint logic in `/api/ai-assistant/analyze/route.ts` to add new suggestion types or change the analysis logic.

## Future Enhancements

1. **Personalization**
   - Learn from user interactions
   - Customize suggestions based on role/interests
   - Remember dismissed suggestions

2. **Advanced Voice Commands**
   - Multi-turn conversations
   - Command shortcuts ("show me trending", "find experts")
   - Voice feedback/responses

3. **Proactive Insights**
   - Notify about important updates
   - Suggest connections based on current work
   - Alert about relevant new content

4. **Analytics**
   - Track which suggestions are most helpful
   - Measure engagement with different features
   - A/B test suggestion algorithms

## Performance Considerations

- Context detection debounced by 300ms to prevent excessive updates
- API calls cached to reduce redundant requests
- Suggestion position updates throttled during movement
- Voice interface only initialized when activated

## Browser Compatibility

- **Cursor tracking**: All modern browsers
- **Voice search**: Chrome, Edge, Safari (requires user permission)
- **Animations**: All browsers supporting CSS transforms
- **Backdrop blur**: May fallback to solid background in older browsers