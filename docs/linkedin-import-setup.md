# LinkedIn Import - Production Setup Guide

## Overview
The LinkedIn import feature supports multiple production-ready APIs. Choose one based on your needs and budget.

## Supported Services

### 1. Proxycurl (Recommended - High Quality)
**Best for**: High-quality data, reliable service, good documentation
**Pricing**: $0.01 - $0.10 per profile lookup
**Setup**:
1. Sign up at https://nubela.co/proxycurl
2. Get your API key from the dashboard
3. Add to `.env.local`:
   ```
   PROXYCURL_API_KEY=your_api_key_here
   ```

### 2. RapidAPI LinkedIn Scraper
**Best for**: Quick setup, pay-as-you-go pricing
**Pricing**: Varies by provider ($0.001 - $0.05 per request)
**Setup**:
1. Sign up at https://rapidapi.com
2. Subscribe to: https://rapidapi.com/rockapis-rockapis-default/api/linkedin-profile-data
3. Get your API key
4. Add to `.env.local`:
   ```
   RAPIDAPI_KEY=your_rapidapi_key_here
   ```

### 3. Bright Data
**Best for**: Enterprise scale, highest reliability
**Pricing**: Custom pricing, contact sales
**Setup**:
1. Sign up at https://brightdata.com
2. Create a LinkedIn dataset collector
3. Get your credentials
4. Add to `.env.local`:
   ```
   BRIGHTDATA_USERNAME=your_username
   BRIGHTDATA_PASSWORD=your_password
   ```

## Implementation Features

### ✅ Production-Ready Features
- **Caching**: 24-hour cache to reduce API costs
- **Error Handling**: Graceful fallbacks and user-friendly error messages
- **Validation**: LinkedIn URL validation before API calls
- **Privacy**: Excludes personal emails and phone numbers
- **Rate Limiting**: Built-in protection against excessive requests

### 🔒 Security Considerations
- API keys stored in environment variables
- No sensitive data logged
- HTTPS-only connections
- Input sanitization

## Testing Your Setup

1. Add your chosen API credentials to `.env.local`
2. Restart your Next.js development server
3. Navigate to the onboarding page
4. Click "Import from LinkedIn"
5. Enter a LinkedIn profile URL (e.g., https://www.linkedin.com/in/satyanadella)
6. Verify the data imports correctly

## Cost Optimization

### Caching Strategy
- Profiles are cached for 24 hours
- Cache key is based on LinkedIn username
- Repeated imports of the same profile are free

### Rate Limiting
To add additional rate limiting, you can use a service like Upstash:

```typescript
// Install: npm install @upstash/ratelimit @upstash/redis
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"), // 10 requests per hour
});
```

## Monitoring

### Logging
The API logs the following:
- Cache hits/misses
- API errors
- Response times

### Error Tracking
Consider adding error tracking with Sentry:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.captureException(error, {
  tags: {
    api: "linkedin-import",
    service: "proxycurl"
  }
});
```

## Troubleshooting

### Common Issues

1. **"LinkedIn import is not configured"**
   - Solution: Add one of the API keys to your `.env.local`

2. **"Invalid LinkedIn URL"**
   - Solution: Ensure the URL is in format: https://www.linkedin.com/in/username

3. **Rate limit exceeded**
   - Solution: Wait before retrying or upgrade your API plan

4. **Profile not found**
   - Solution: Ensure the profile is public or try a different API service

### Debug Mode
Add to your `.env.local` to enable debug logging:
```
LINKEDIN_IMPORT_DEBUG=true
```

## Legal Considerations

- Ensure you have user consent before importing their data
- Review LinkedIn's Terms of Service
- Consider adding a disclaimer about data usage
- Respect user privacy - don't store unnecessary personal information

## Support

For issues or questions:
1. Check the service-specific documentation
2. Review error logs in your application
3. Contact the API provider's support team