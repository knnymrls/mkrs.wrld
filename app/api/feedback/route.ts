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
      const error = await response.text();
      console.error('GitHub API error:', error);
      return NextResponse.json(
        { error: 'Failed to create GitHub issue' },
        { status: 500 }
      );
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