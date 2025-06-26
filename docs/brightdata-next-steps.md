# Next Steps: Complete Bright Data Setup

## Your API Token is Set! ✅
API Token: `fd273217-e5a8-4bb5-b733-03526139472c` (already added to .env.local)

## Now You Need to Get Your Dataset ID

### Step 1: Log into Bright Data
1. Go to [https://brightdata.com](https://brightdata.com)
2. Log in with your account

### Step 2: Create a LinkedIn Profile Dataset
1. In your dashboard, look for one of these options:
   - "Web Scraper IDE"
   - "Datasets" 
   - "Data Collector"
   - "Web Scraper"

2. Click "Create New Dataset" or "New Collector"

3. Select:
   - Platform: **LinkedIn**
   - Type: **Profile** (not Company or Jobs)

4. Name your dataset something like:
   - "LinkedIn Profile Import"
   - "Profile Scraper"

5. In the configuration:
   - Output format: **JSON**
   - Make sure all profile fields are included

### Step 3: Find Your Dataset ID
Once created, you'll find the dataset ID in one of these places:
- In the dataset list (usually shown as a code like `gd_abc123xyz`)
- In the dataset settings/configuration page
- In the API documentation for your specific dataset

### Step 4: Add Dataset ID to Your App
Once you have the dataset ID, add it to your `.env.local`:
```
BRIGHTDATA_DATASET_ID=your_dataset_id_here
```

### Step 5: Restart and Test
1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Go to the onboarding page

3. Click "Import from LinkedIn"

4. Try importing a LinkedIn profile URL like:
   - https://www.linkedin.com/in/satyanadella
   - https://www.linkedin.com/in/jeffweiner08
   - Your own LinkedIn profile URL

## If You Can't Find the Dataset Option

Bright Data offers different products. You might need to:

1. **Check your account type** - Some features require a paid plan
2. **Look for "Web Scraper API"** specifically
3. **Contact support** - They can help you set up LinkedIn profile scraping

## Alternative: Quick Test
If you're having trouble finding the dataset option, you can also:
1. Look for any existing LinkedIn datasets in your account
2. Use their support chat to ask for the LinkedIn Profile dataset ID
3. Check their documentation at [docs.brightdata.com](https://docs.brightdata.com)

## Troubleshooting

### "Dataset not found" error
- Double-check the dataset ID format
- Ensure the dataset is activated/enabled
- Make sure it's a Profile dataset, not Company or Jobs

### "Unauthorized" error
- Verify your API token is correct
- Check if your account has access to Web Scraper API
- Ensure your account is not in trial expired state

## Need Help?
- Bright Data Support: Available 24/7 in their dashboard
- Documentation: [docs.brightdata.com](https://docs.brightdata.com)
- API Reference: Look for "Web Scraper API" → "LinkedIn"