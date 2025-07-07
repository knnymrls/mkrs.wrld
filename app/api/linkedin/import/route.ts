import { NextRequest, NextResponse } from 'next/server';
import { LinkedInParser, LinkedInProfile } from '@/lib/linkedin/parser';
import https from 'https';

// Cache for storing fetched profiles (24 hour TTL)
const profileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to make HTTPS request
function httpsRequest(options: https.RequestOptions, data: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

export async function POST(request: NextRequest) {
  try {
    const { linkedinUrl } = await request.json();

    if (!linkedinUrl) {
      return NextResponse.json(
        { error: 'LinkedIn URL is required' },
        { status: 400 }
      );
    }

    // Clean up the URL - remove backslashes and extra quotes
    const cleanedUrl = linkedinUrl
      .replace(/\\/g, '') // Remove all backslashes
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .trim();

    // Validate LinkedIn URL
    if (!LinkedInParser.isValidLinkedInUrl(cleanedUrl)) {
      return NextResponse.json(
        { error: 'Invalid LinkedIn URL' },
        { status: 400 }
      );
    }

    // Extract username from URL
    const username = LinkedInParser.extractUsername(cleanedUrl);
    if (!username) {
      return NextResponse.json(
        { error: 'Could not extract username from LinkedIn URL' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = profileCache.get(username);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Returning cached LinkedIn profile for:', username);
      return NextResponse.json({
        success: true,
        profile: cached.data,
        message: 'LinkedIn profile imported successfully (cached)'
      });
    }

    // Check if Bright Data is configured
    if (!process.env.BRIGHTDATA_API_TOKEN || !process.env.BRIGHTDATA_DATASET_ID) {
      return NextResponse.json(
        { 
          error: 'LinkedIn import is not configured. Please set BRIGHTDATA_API_TOKEN and BRIGHTDATA_DATASET_ID in your environment variables.',
          setupInstructions: {
            step1: 'Sign up at https://brightdata.com',
            step2: 'Get your API token from the dashboard',
            step3: 'Add to .env.local: BRIGHTDATA_API_TOKEN=your_token',
            step4: 'Add to .env.local: BRIGHTDATA_DATASET_ID=your_dataset_id'
          }
        },
        { status: 503 }
      );
    }

    try {
      // Use Bright Data's exact format with cleaned URL
      const data = JSON.stringify([{ url: cleanedUrl }]);

      const options = {
        hostname: 'api.brightdata.com',
        path: `/datasets/v3/trigger?dataset_id=${process.env.BRIGHTDATA_DATASET_ID}&include_errors=true`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BRIGHTDATA_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      };

      console.log('Triggering Bright Data collection...');
      const triggerResponse = await httpsRequest(options, data);
      console.log('Trigger response:', triggerResponse);

      // If we get a snapshot_id, we need to poll for results
      if (triggerResponse.snapshot_id) {
        const maxAttempts = 60; // 60 seconds timeout
        let attempts = 0;
        
        while (attempts < maxAttempts) {
          // Wait before checking (start with 2 seconds, then 1 second intervals)
          await new Promise(resolve => setTimeout(resolve, attempts === 0 ? 2000 : 1000));
          
          // Check progress using the progress endpoint
          const progressOptions = {
            hostname: 'api.brightdata.com',
            path: `/datasets/v3/progress/${triggerResponse.snapshot_id}`,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.BRIGHTDATA_API_TOKEN}`,
            },
          };

          const progressResponse = await httpsRequest(progressOptions, '');
          console.log(`Attempt ${attempts + 1}: Progress response:`, progressResponse);

          // Check if the snapshot is ready
          if (progressResponse.status === 'ready') {
            // Get the data using the snapshot endpoint
            const dataOptions = {
              hostname: 'api.brightdata.com',
              path: `/datasets/v3/snapshot/${triggerResponse.snapshot_id}?format=json`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.BRIGHTDATA_API_TOKEN}`,
              },
            };

            const snapshotData = await httpsRequest(dataOptions, '');
            console.log('Got snapshot data:', JSON.stringify(snapshotData).substring(0, 500));

            if (Array.isArray(snapshotData) && snapshotData.length > 0) {
              const profile = transformBrightDataProfile(snapshotData[0]);
              const transformedData = transformProfile(profile);
              
              // Cache the result
              profileCache.set(username, { data: transformedData, timestamp: Date.now() });
              
              return NextResponse.json({
                success: true,
                profile: transformedData,
                message: 'LinkedIn profile imported successfully'
              });
            }
          }

          // Check if failed
          if (progressResponse.status === 'failed' || progressResponse.error) {
            console.error('Snapshot failed:', progressResponse.error || 'Unknown error');
            throw new Error('Failed to fetch LinkedIn profile data');
          }

          attempts++;
        }
        
        throw new Error('Timeout waiting for LinkedIn profile data');
      }

      // Check if data was returned immediately
      if (Array.isArray(triggerResponse) && triggerResponse.length > 0) {
        const profile = transformBrightDataProfile(triggerResponse[0]);
        const transformedData = transformProfile(profile);
        
        // Cache the result
        profileCache.set(username, { data: transformedData, timestamp: Date.now() });
        
        return NextResponse.json({
          success: true,
          profile: transformedData,
          message: 'LinkedIn profile imported successfully'
        });
      }

      throw new Error('No snapshot ID or data returned from Bright Data');

    } catch (error) {
      console.error('Bright Data API error:', error);
      throw error;
    }

  } catch (error) {
    console.error('LinkedIn import error:', error);
    
    // If all methods fail, return an error suggesting manual entry
    return NextResponse.json({
      error: 'Unable to fetch LinkedIn profile. Please use the Copy & Paste method instead.',
      fallbackMethod: 'paste'
    }, { status: 400 });
  }
}

function transformBrightDataProfile(data: any): LinkedInProfile {
  // Handle the actual Bright Data response format
  const skills: string[] = [];
  
  // Extract skills from various possible fields
  if (data.skills) {
    if (Array.isArray(data.skills)) {
      skills.push(...data.skills);
    } else if (typeof data.skills === 'string') {
      skills.push(...data.skills.split(',').map((s: string) => s.trim()));
    }
  }
  
  // Build full name - Bright Data provides it as "name" or separate first_name/last_name
  const name = data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim();
  
  // Handle experience - Bright Data uses "experience" array or current position
  let experiences = [];
  if (data.experience && Array.isArray(data.experience) && data.experience.length > 0) {
    experiences = data.experience.map((exp: any) => ({
      company: exp.company || exp.company_name || '',
      title: exp.title || exp.position || exp.role || '',
      location: exp.location || '',
      startDate: exp.start_date || exp.start_year || '',
      endDate: exp.end_date || exp.end_year || 'Present',
      description: exp.description || exp.description_html || ''
    }));
  } else if (data.position || data.current_company_name) {
    // Add current position as experience if no experience array
    experiences.push({
      company: data.current_company_name || data.current_company?.name || '',
      title: data.position || '',
      location: data.current_company?.location || '',
      startDate: '',
      endDate: 'Present',
      description: ''
    });
  }
  
  return {
    name: name,
    title: data.position || data.headline || data.current_position?.title || '',
    location: data.city || data.location || '',
    bio: data.about || data.summary || '',
    skills: skills,
    education: data.education?.map((edu: any) => ({
      school: edu.title || edu.school || edu.institute_name || '',
      degree: edu.degree || edu.field || edu.description || '',
      field: edu.field || edu.field_of_study || '',
      startYear: edu.start_year || '',
      endYear: edu.end_year || ''
    })) || [],
    experience: experiences,
    profilePicture: data.avatar && !data.default_avatar ? data.avatar : undefined
  };
}

function transformProfile(profile: LinkedInProfile) {
  return {
    name: profile.name || '',
    title: profile.title || '',
    location: profile.location || '',
    bio: profile.bio || '',
    skills: profile.skills?.join(', ') || '',
    education: profile.education?.map(edu => ({
      school: edu.school || '',
      degree: edu.degree || '',
      year: edu.endYear || ''
    })) || [],
    experience: profile.experience?.map(exp => ({
      company: exp.company,
      role: exp.title,
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      description: exp.description || ''
    })) || [],
    profilePicture: profile.profilePicture
  };
}