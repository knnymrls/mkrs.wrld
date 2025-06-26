# Bright Data LinkedIn Import Setup

## Overview
This guide will help you set up Bright Data for importing LinkedIn profiles into your onboarding flow.

## Prerequisites
- Bright Data account (free trial available)
- Credit card for billing (pay-as-you-go, starting at $0.001 per record)

## Setup Steps

### 1. Create a Bright Data Account
1. Go to [https://brightdata.com](https://brightdata.com)
2. Click "Start Free Trial"
3. Complete the registration process
4. Verify your email address

### 2. Create a LinkedIn Profile Dataset
1. Log into your Bright Data dashboard
2. Navigate to "Web Scraper IDE" or "Datasets"
3. Click "Create New Dataset"
4. Select "LinkedIn" → "Profile"
5. Name your dataset (e.g., "LinkedIn Profile Import")
6. Configure the dataset settings:
   - Output format: JSON
   - Include all available fields
7. Save your dataset

### 3. Get Your API Credentials
1. In your Bright Data dashboard, go to "API Access"
2. Generate a new API token
3. Copy your API token
4. Find your dataset ID in the dataset settings

### 4. Add Credentials to Your App
Add these to your `.env.local` file:
```
BRIGHTDATA_API_TOKEN=your_api_token_here
BRIGHTDATA_DATASET_ID=your_dataset_id_here
```

### 5. Test the Integration
1. Restart your Next.js development server
2. Go to the onboarding page
3. Click "Import from LinkedIn"
4. Enter a LinkedIn profile URL
5. Click "Import Profile"

## Pricing

### Current Pricing (2025)
- Starting at $0.001 per profile
- Free trial includes 20 API calls
- Special offer: Use code `APIS25` for 25% off for 6 months

### Cost Optimization
- Profiles are cached for 24 hours to reduce API calls
- Only successful imports are charged
- Monitor usage in your Bright Data dashboard

## Troubleshooting

### Common Issues

#### "LinkedIn import is not configured"
- Ensure both `BRIGHTDATA_API_TOKEN` and `BRIGHTDATA_DATASET_ID` are set
- Restart your development server after adding environment variables

#### "Invalid Bright Data API token"
- Double-check your API token in the Bright Data dashboard
- Ensure there are no extra spaces or quotes around the token

#### "Rate limit exceeded"
- Check your Bright Data plan limits
- Consider upgrading your plan or waiting before retrying

#### "Timeout waiting for LinkedIn profile data"
- Some profiles may take longer to fetch
- Try again with a different profile
- Check Bright Data status page for any service issues

## API Response Times
- Typical response time: 5-15 seconds
- Complex profiles may take up to 30 seconds
- Cached responses return instantly

## Best Practices

### 1. Error Handling
The integration includes comprehensive error handling:
- Invalid URLs are rejected before API calls
- Clear error messages for setup issues
- Graceful fallback to manual entry

### 2. User Experience
- Show loading state during import
- Provide clear feedback on success/failure
- Offer manual entry as an alternative

### 3. Data Privacy
- Only import user's own profile data
- Don't store API credentials in code
- Clear cache periodically for privacy

## Alternative Import Methods

If Bright Data is not suitable, users can still:
1. **Copy & Paste**: Manual copy from LinkedIn
2. **PDF Upload**: Save LinkedIn profile as PDF (future feature)
3. **Manual Entry**: Type information directly

## Support

### Bright Data Support
- Documentation: [docs.brightdata.com](https://docs.brightdata.com)
- Support: Available 24/7 for API users
- Email: support@brightdata.com

### Application Support
- Check application logs for detailed error messages
- Ensure all environment variables are properly set
- Test with different LinkedIn profile URLs

## Compliance

### Legal Considerations
- Only scrape publicly available information
- Respect LinkedIn's robots.txt
- Comply with GDPR and CCPA regulations
- Get user consent before importing their data

### Bright Data Compliance
- Bright Data handles proxy rotation
- Automatic CAPTCHA solving
- Rate limiting to avoid detection
- Compliance with data protection laws