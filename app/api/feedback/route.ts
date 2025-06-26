import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, description, userEmail, userName } = body;

    // Validate required fields
    if (!type || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Map feedback type to GitHub label
    const labelMap: Record<string, string> = {
      bug: 'bug',
      feature: 'enhancement',
      improvement: 'improvement',
      other: 'question'
    };

    // Format the issue body
    const issueBody = `## Feedback Type
${type.charAt(0).toUpperCase() + type.slice(1)}

## Description
${description}

## Submitted By
- User: ${userName}
- Email: ${userEmail || 'Not provided'}

---
*This issue was automatically created from the in-app feedback form.*`;

    // Create GitHub issue using the GitHub API
    // You'll need to replace these with your actual GitHub repository details
    const GITHUB_OWNER = 'knnymrls'; // Replace with your GitHub username
    const GITHUB_REPO = 'nural-app'; // Replace with your repository name
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // You'll need to add this to your .env.local

    if (!GITHUB_TOKEN) {
      // If no token is configured, we'll just log the feedback
      console.log('Feedback received (no GitHub token configured):', {
        type,
        title,
        description,
        userEmail,
        userName
      });
      
      return NextResponse.json({
        message: 'Feedback received successfully',
        note: 'GitHub integration not configured'
      });
    }

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `[${type}] ${title}`,
          body: issueBody,
          labels: [labelMap[type] || 'feedback'],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', errorText);
      console.error('Response status:', response.status);
      
      let errorMessage = 'Failed to create GitHub issue';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch (e) {
        // If error text is not JSON, use generic message
      }
      
      // If GitHub fails, log the feedback anyway
      console.log('GitHub issue creation failed, logging feedback:', {
        type,
        title,
        description,
        userEmail,
        userName,
        githubError: errorMessage
      });
      
      // Return success but note the GitHub issue wasn't created
      return NextResponse.json({
        message: 'Feedback received and logged (GitHub issue creation failed)',
        note: 'GitHub integration error: ' + errorMessage
      });
    }

    const issue = await response.json();

    return NextResponse.json({
      message: 'Feedback submitted successfully',
      issueUrl: issue.html_url
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}