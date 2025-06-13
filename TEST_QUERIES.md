# Test Queries for Universal Information Retrieval System

This document contains challenging queries to test the intelligence and flexibility of the chatbot's universal retrieval system. These queries are designed to push the boundaries of the system's understanding, especially with limited data.

## Current Database State
- **Profiles**: 1 (Kenny Morales - Catalyst Intern)
- **Skills**: React, Node.js, AI
- **Projects**: 3 (Nural Project, Design, SPED Project)
- **Posts**: 5
- **Embeddings**: Fixed to 1536 dimensions

## Test Query Categories

### 1. Temporal & Analytical Queries
Test the system's ability to handle time-based and statistical queries:
- "How many people joined in the last 6 months with JavaScript experience?"
- "What's the trend in AI-related posts over the past quarter?"
- "Show me all activity from yesterday"
- "Who's been most active in the past week?"
- "What happened last Tuesday?"
- "Find posts from this month about React"

### 2. Multi-hop Relationship Queries
Test graph traversal and connection finding:
- "Who has worked with Kenny on frontend projects?"
- "Find people connected to the Nural Project who also know React"
- "Which teams have overlapping skills with the Design project?"
- "Who knows someone who has worked on AI assistants?"
- "Show me Kenny's network of collaborators"
- "Find indirect connections between AI and design projects"

### 3. Vague/Ambiguous Queries
Test how well the system handles unclear requests:
- "I need someone good with modern web stuff"
- "Who's the best person for a new initiative?"
- "Find me someone technical"
- "Who can help with our digital transformation?"
- "Get me a rock star developer"
- "I need help with computer things"

### 4. Negative/Exclusion Queries
Test filtering and exclusion logic:
- "Who doesn't have AI experience but could learn it?"
- "Projects that aren't related to design"
- "Find developers except Kenny"
- "Active projects excluding AI-related ones"
- "People without React skills"
- "Non-technical team members"

### 5. Complex Composite Queries
Test multi-criteria search capabilities:
- "Find a React developer who's posted about best practices in the last month and isn't currently on a critical project"
- "Who has both frontend and backend experience but is more interested in AI based on their recent posts?"
- "Which intern has shown the most growth in technical skills based on their project contributions?"
- "Find someone with AI skills who's available and has worked on user-facing applications"
- "Who would be good for a 3-month project requiring React and Node.js starting next week?"

### 6. Open-ended Discovery
Test exploratory and broad queries:
- "What's happening in the company?"
- "Tell me something interesting about our tech stack"
- "What are people excited about lately?"
- "Discover hidden connections in our organization"
- "What should I know about our team?"
- "Give me insights about our projects"

### 7. Skill Gap Analysis
Test analytical capabilities about missing expertise:
- "What expertise are we missing for a machine learning project?"
- "Which skills does Kenny need to become a senior developer?"
- "What's the difference between our AI capabilities and what we need for the Nural Project?"
- "Identify skill gaps in our organization"
- "What training would benefit our team most?"
- "Where are we weak technically?"

### 8. Contextual Understanding
Test context awareness and inference:
- "Who would complement Kenny on a team?"
- "Find someone who could mentor our interns"
- "Who has the opposite skillset to our current team?"
- "Which projects could benefit from Kenny's expertise?"
- "Build me a balanced team for a full-stack project"
- "Who should review Kenny's code?"

### 9. Queries with Typos/Misspellings
Test robustness to user errors:
- "Whos good at reakt development?"
- "Find someome for the nueral project"
- "Kenny moreles recent aktivety"
- "Shoe me peeple with JavaScritp"
- "Wat projekts need hlp?"
- "ho nows abut artificail inteligence"

### 10. Impossible/No-Result Queries
Test how the system handles requests for non-existent data:
- "Find Python experts who've worked at Google"
- "Who has a PhD in quantum computing?"
- "Show me all blockchain projects from 2019"
- "List everyone in the New York office"
- "Find senior architects with 10+ years experience"
- "Who knows Rust and has contributed to open source?"

### 11. Natural Language Variations
Test understanding of different phrasings:
- "I'm looking for folks who can code"
- "Need an AI person ASAP"
- "Who should I talk to about React?"
- "Is there anyone here who gets AI?"
- "Point me to your best developer"
- "Who's the go-to person for tech questions?"

### 12. Domain-Specific Queries
Test ability to understand different contexts:
- "Who can help with UI/UX?"
- "Find full-stack developers"
- "Who understands cloud architecture?"
- "Find people with startup experience"
- "Who's worked on scalability issues?"
- "Find developers who care about code quality"

## Expected Intelligent Behaviors

### When No Direct Results Found:
1. **Suggest Related People**: "I didn't find Python experts, but Kenny knows AI and could likely learn Python quickly."
2. **Ask Clarifying Questions**: "I didn't find senior developers. Are you looking for experienced developers or people with leadership skills?"
3. **Provide Partial Matches**: "No one has blockchain experience, but here are people with related cryptography or distributed systems knowledge."
4. **Suggest Alternatives**: "We don't have dedicated UI/UX people, but Kenny has worked on frontend projects and might have relevant experience."

### When Query is Ambiguous:
1. **Break Down Intent**: "By 'modern web stuff', are you looking for React/Vue developers, or cloud-native expertise?"
2. **Offer Multiple Interpretations**: "I found results for both 'rock star developers' (high performers) and 'developers interested in music'."
3. **Progressive Refinement**: "Here's everyone technical. Would you like to narrow it down by specific skills or availability?"

### When Query Has Temporal Elements:
1. **Handle Missing Timeframes**: "I don't have data from last Tuesday specifically, but here's recent activity from the past week."
2. **Suggest Time Ranges**: "No activity yesterday. Would you like to see activity from the past 3 days instead?"
3. **Explain Data Limitations**: "I can only search posts from [earliest date] onwards. Here's what I found in that range."

## Testing Instructions

1. Ask these queries to test different aspects of the system
2. Note which queries return helpful results vs unhelpful responses
3. Pay special attention to the follow-up questions provided
4. Test variations of queries that didn't work well
5. Document any patterns in what works vs what doesn't

## Success Criteria

A truly intelligent system should:
- ✅ Find Kenny for AI-related queries even with typos
- ✅ Suggest Kenny could learn Python when asked about Python experts
- ✅ Ask clarifying questions for vague queries
- ✅ Provide helpful alternatives when no exact matches exist
- ✅ Understand "modern web stuff" means React/Node.js in this context
- ✅ Handle temporal queries gracefully even with limited data
- ✅ Make intelligent connections (e.g., AI → machine learning → data science)
- ✅ Recognize when Kenny is the only option but still provide useful context