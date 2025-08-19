#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test configuration
const API_BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/ai-assistant/analyze';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Helper function to make API calls
async function callAPI(context, userId) {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context,
        userId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Helper function to print results
function printResult(testName, result) {
  console.log(`\n${colors.cyan}📋 Test: ${testName}${colors.reset}`);

  if (result.success) {
    console.log(`${colors.green}✅ Success${colors.reset}`);

    if (result.data.suggestions && result.data.suggestions.length > 0) {
      console.log(`\n${colors.blue}Suggestions (${result.data.suggestions.length}):${colors.reset}`);

      result.data.suggestions.forEach((suggestion, index) => {
        console.log(`\n  ${colors.yellow}${index + 1}. ${suggestion.title}${colors.reset}`);
        console.log(`     Type: ${suggestion.type}`);
        console.log(`     ${suggestion.description}`);

        if (suggestion.action) {
          console.log(`     Action: ${suggestion.action.label}`);
          if (suggestion.action.href) {
            console.log(`     Link: ${suggestion.action.href}`);
          }
        }
      });
    } else {
      console.log(`${colors.yellow}⚠️  No suggestions returned${colors.reset}`);
    }
  } else {
    console.log(`${colors.red}❌ Failed: ${result.error}${colors.reset}`);
  }
}

// Get sample data from the database
async function getSampleData() {
  console.log(`${colors.magenta}🔍 Fetching sample data from Supabase...${colors.reset}`);

  // Get a sample profile with skills
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*, skills(*)')
    .not('name', 'is', null)
    .limit(1);

  if (profileError) {
    console.error('Profile error:', profileError);
  }

  // Get a sample post with mentions
  const { data: posts, error: postError } = await supabase
    .from('posts')
    .select('*, post_mentions(*), post_projects(*)')
    .limit(1);

  if (postError) {
    console.error('Post error:', postError);
  }

  // Get a sample project with contributors
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('*, contributions(*)')
    .limit(1);

  if (projectError) {
    console.error('Project error:', projectError);
  }

  return {
    profile: profiles?.[0],
    post: posts?.[0],
    project: projects?.[0],
  };
}

// Main test function
async function runTests() {
  console.log(`${colors.magenta}🚀 Starting AI Assistant API Tests${colors.reset}`);
  console.log(`API Endpoint: ${API_BASE_URL}${API_ENDPOINT}\n`);

  // Get sample data
  const sampleData = await getSampleData();

  if (!sampleData.profile || !sampleData.post || !sampleData.project) {
    console.error(`${colors.red}❌ Could not fetch sample data from database${colors.reset}`);
    console.log('Available data:', {
      hasProfile: !!sampleData.profile,
      hasPost: !!sampleData.post,
      hasProject: !!sampleData.project,
    });
    return;
  }

  console.log(`${colors.green}✅ Sample data fetched successfully${colors.reset}`);
  console.log(`  Profile: ${sampleData.profile.name} (${sampleData.profile.id})`);
  console.log(`  Post ID: ${sampleData.post.id} - "${sampleData.post.content.substring(0, 50)}..."`);
  console.log(`  Project: ${sampleData.project.title} (${sampleData.project.id})`);

  // Test 1: Profile context
  console.log(`\n${colors.magenta}═══ Running Test 1: Profile Context ═══${colors.reset}`);
  const profileResult = await callAPI({
    type: 'profile',
    id: sampleData.profile.id,
    content: sampleData.profile.name,
    metadata: {
      title: sampleData.profile.title,
      location: sampleData.profile.location,
      skills: sampleData.profile.skills?.length || 0,
    }
  });
  printResult('Profile Context Analysis', profileResult);

  // Test 2: Post context
  console.log(`\n${colors.magenta}═══ Running Test 2: Post Context ═══${colors.reset}`);
  const postResult = await callAPI({
    type: 'post',
    id: sampleData.post.id,
    content: sampleData.post.content,
    metadata: {
      author_id: sampleData.post.author_id,
      mentions: sampleData.post.post_mentions?.length || 0,
      projects: sampleData.post.post_projects?.length || 0,
    }
  });
  printResult('Post Context Analysis', postResult);

  // Test 3: Project context
  console.log(`\n${colors.magenta}═══ Running Test 3: Project Context ═══${colors.reset}`);
  const projectResult = await callAPI({
    type: 'project',
    id: sampleData.project.id,
    content: sampleData.project.title,
    metadata: {
      status: sampleData.project.status,
      description: sampleData.project.description,
      contributors: sampleData.project.contributions?.length || 0,
    }
  }, sampleData.profile.id); // Pass userId to test "join project" suggestion
  printResult('Project Context Analysis', projectResult);

  // Test 4: Invalid context (should return empty suggestions)
  console.log(`\n${colors.magenta}═══ Running Test 4: Invalid Context ═══${colors.reset}`);
  const invalidResult = await callAPI({
    type: null,
    id: null,
    content: null,
  });
  printResult('Invalid Context (should return empty)', invalidResult);

  // Test 5: Edge case - missing required fields
  console.log(`\n${colors.magenta}═══ Running Test 5: Partial Context ═══${colors.reset}`);
  const partialResult = await callAPI({
    type: 'profile',
    id: sampleData.profile.id,
    content: null, // Missing content
  });
  printResult('Partial Context (missing content)', partialResult);

  console.log(`\n${colors.magenta}✨ All tests completed!${colors.reset}\n`);
}

// Performance test
async function performanceTest() {
  console.log(`\n${colors.magenta}⚡ Running Performance Test${colors.reset}`);

  const sampleData = await getSampleData();
  if (!sampleData.profile) {
    console.error('No sample data for performance test');
    return;
  }

  const iterations = 5;
  const times = [];

  console.log(`Making ${iterations} API calls...`);

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();

    await callAPI({
      type: 'profile',
      id: sampleData.profile.id,
      content: sampleData.profile.name,
    });

    const elapsed = Date.now() - start;
    times.push(elapsed);
    process.stdout.write(`${colors.cyan}.${colors.reset}`);
  }

  console.log('\n');

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log(`${colors.green}Performance Results:${colors.reset}`);
  console.log(`  Average: ${avgTime.toFixed(2)}ms`);
  console.log(`  Min: ${minTime}ms`);
  console.log(`  Max: ${maxTime}ms`);
}

// Check if the API server is running
async function checkServer() {
  try {
    const response = await fetch(API_BASE_URL);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  // Check if server is running
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.error(`${colors.red}❌ Server is not running at ${API_BASE_URL}${colors.reset}`);
    console.error(`${colors.yellow}Please start the development server with: npm run dev${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.green}✅ Server is running${colors.reset}\n`);

  // Run all tests
  await runTests();

  // Run performance test
  await performanceTest();
}

// Run the tests
main().catch(console.error);