# LinkedIn Profile Import

## Overview
The LinkedIn import feature allows users to quickly populate their profile during onboarding by importing their LinkedIn profile information.

## How It Works

### User Flow
1. On the onboarding page, users see an "Import from LinkedIn" button
2. Clicking the button opens a modal where they can enter their LinkedIn profile URL
3. The system processes the URL and imports available information
4. Form fields are automatically populated with the imported data
5. Users can review and edit the information before saving

### Technical Implementation

#### Components
- **LinkedIn Parser** (`lib/linkedin/parser.ts`): Handles parsing of LinkedIn profile data
- **API Endpoint** (`app/api/linkedin/import/route.ts`): Processes import requests
- **Onboarding UI** (`app/(main)/onboarding/page.tsx`): Updated with import button and modal

#### Data Mapping
The following LinkedIn data is imported:
- **Name**: Full name
- **Title**: Current job title/headline
- **Location**: Current location
- **Bio**: LinkedIn summary/about section
- **Skills**: List of skills (comma-separated)
- **Education**: School, degree, and graduation year
- **Experience**: Company, role, dates, and descriptions

## Current Implementation

### Mock Data
The current implementation returns mock data to demonstrate the flow. This allows testing the UI and data mapping without requiring actual LinkedIn scraping.

### Production Implementation Options

To implement real LinkedIn data import in production, consider these approaches:

1. **LinkedIn API**
   - Requires OAuth integration
   - User must authorize access
   - Most reliable but requires LinkedIn partnership

2. **Web Scraping Service**
   - Use services like Puppeteer, Playwright, or third-party APIs
   - Example services: ScrapingBee, Proxycrawl, Scrapfly
   - Add to API endpoint:
   ```typescript
   const response = await fetch('https://your-scraping-service.com/api/linkedin', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${process.env.SCRAPING_API_KEY}`
     },
     body: JSON.stringify({ url: linkedinUrl })
   });
   ```

3. **Browser Extension**
   - Create a browser extension that can access LinkedIn pages
   - Send data to your API when user is on their profile

4. **Manual Copy-Paste**
   - Provide a text area for users to paste their LinkedIn profile
   - Parse the pasted content

## Security Considerations

- Validate LinkedIn URLs before processing
- Sanitize imported data to prevent XSS
- Rate limit import requests
- Store API keys securely in environment variables
- Consider privacy implications of storing LinkedIn data

## Future Enhancements

1. **Profile Picture Import**: Download and store profile pictures
2. **Recommendations Import**: Import endorsements and recommendations
3. **Projects Import**: Import featured projects and portfolios
4. **Publications Import**: Import articles and publications
5. **Certifications Import**: Import professional certifications