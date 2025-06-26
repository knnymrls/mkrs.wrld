# Feedback Feature

## Overview
The feedback feature allows users to submit bug reports, feature requests, improvements, and other feedback directly from the app. Feedback is submitted as GitHub issues to help track and manage user input.

## How to Access

### 1. Via Navigation Menu
- Click on your profile icon in the navbar
- Select "Send Feedback" from the dropdown menu

### 2. Via Activity Feed
- Click the feedback icon (speech bubble) next to the notifications bell on the Activity Feed page

### 3. Via Keyboard Shortcut
- Press `Cmd+Shift+F` (Mac) or `Ctrl+Shift+F` (Windows/Linux)

## Feedback Types

- **🐛 Bug Report**: Report issues or problems with the app
- **✨ Feature Request**: Suggest new features or functionality
- **💡 Improvement**: Propose enhancements to existing features
- **💬 Other**: General feedback or questions

## GitHub Integration

To enable automatic GitHub issue creation:

1. Create a GitHub Personal Access Token:
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Generate a new token with `repo` scope
   
2. Add the token to your `.env.local`:
   ```
   GITHUB_TOKEN=your_token_here
   ```

3. Update the repository details in `/app/api/feedback/route.ts`:
   ```typescript
   const GITHUB_OWNER = 'your-github-username';
   const GITHUB_REPO = 'your-repo-name';
   ```

Without GitHub integration, feedback will be logged to the console for manual processing.

## Implementation Details

### Components
- `FeedbackModal.tsx`: Modal component for the feedback form
- `api/feedback/route.ts`: API endpoint that handles feedback submission

### Features
- Clean, modal-based UI matching the app's design system
- Form validation
- Loading states
- Success confirmation
- Automatic GitHub issue creation with appropriate labels

## Future Enhancements
- Add image/screenshot upload capability
- Email notifications for feedback submission
- In-app feedback tracking and status updates
- Integration with other issue tracking systems