# AI Assistant Widget Implementation

## Overview
We've implemented an interactive AI Assistant widget that provides context-aware suggestions as users navigate the Nural platform. The assistant appears as a floating orb that follows the cursor and provides intelligent insights based on what the user is hovering over.

## Key Features

### 1. **Floating AI Orb**
- Smooth cursor-following animation using Framer Motion
- Glowing effects with particle animations
- Expandable interface on click
- Green gradient design matching Nural's brand

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
- Onboarding tooltip for first-time users
- Rotating tips about features
- Settings button for customization
- Quick access to chat interface
- Responsive design with proper overflow handling

## Technical Implementation

### Components Structure
```
app/components/features/AIAssistant/
├── index.tsx              # Main coordinator component
├── AIAssistantOrb.tsx     # Floating orb with animations
├── ContextDetector.tsx    # Hover detection logic
├── SuggestionBubble.tsx   # Tooltip for suggestions
├── VoiceInterface.tsx     # Voice search modal
└── OnboardingTooltip.tsx  # First-time user guide
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
1. The AI orb automatically appears and follows your cursor
2. Hover over any post, profile, or project to see insights
3. Click the orb to access voice search or chat
4. Say "Hey Nural, [your question]" for hands-free search

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

### Disable for Specific Pages
Pass `enabled={false}` to the AIAssistant component:
```tsx
<AIAssistant enabled={!isAuthPage} />
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