#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/api/ai-assistant/analyze"

echo -e "${MAGENTA}🚀 AI Assistant API Test Script${NC}"
echo -e "Testing endpoint: ${API_URL}\n"

# Check if server is running
echo -e "${CYAN}Checking if server is running...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|404"; then
    echo -e "${GREEN}✅ Server is running${NC}\n"
else
    echo -e "${RED}❌ Server is not running. Please start it with: npm run dev${NC}"
    exit 1
fi

# Test 1: Profile Context
echo -e "${MAGENTA}═══ Test 1: Profile Context ═══${NC}"
echo -e "${YELLOW}Request:${NC}"
cat <<EOF
{
  "context": {
    "type": "profile",
    "id": "12345678-1234-1234-1234-123456789012",
    "content": "John Doe",
    "metadata": {
      "title": "Senior Developer",
      "location": "San Francisco"
    }
  }
}
EOF

echo -e "\n${YELLOW}Response:${NC}"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "type": "profile",
      "id": "12345678-1234-1234-1234-123456789012",
      "content": "John Doe",
      "metadata": {
        "title": "Senior Developer",
        "location": "San Francisco"
      }
    }
  }' | jq '.' || echo "Install jq for pretty JSON output"

echo -e "\n"

# Test 2: Post Context
echo -e "${MAGENTA}═══ Test 2: Post Context ═══${NC}"
echo -e "${YELLOW}Request:${NC}"
cat <<EOF
{
  "context": {
    "type": "post",
    "id": "87654321-4321-4321-4321-210987654321",
    "content": "Working on implementing the new AI features for our knowledge graph...",
    "metadata": {
      "author_id": "12345678-1234-1234-1234-123456789012"
    }
  }
}
EOF

echo -e "\n${YELLOW}Response:${NC}"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "type": "post",
      "id": "87654321-4321-4321-4321-210987654321",
      "content": "Working on implementing the new AI features for our knowledge graph...",
      "metadata": {
        "author_id": "12345678-1234-1234-1234-123456789012"
      }
    }
  }' | jq '.' || echo "Install jq for pretty JSON output"

echo -e "\n"

# Test 3: Project Context
echo -e "${MAGENTA}═══ Test 3: Project Context ═══${NC}"
echo -e "${YELLOW}Request:${NC}"
cat <<EOF
{
  "context": {
    "type": "project",
    "id": "11111111-2222-3333-4444-555555555555",
    "content": "Knowledge Graph AI",
    "metadata": {
      "status": "active",
      "description": "Building an AI-powered knowledge discovery system"
    }
  },
  "userId": "12345678-1234-1234-1234-123456789012"
}
EOF

echo -e "\n${YELLOW}Response:${NC}"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "type": "project",
      "id": "11111111-2222-3333-4444-555555555555",
      "content": "Knowledge Graph AI",
      "metadata": {
        "status": "active",
        "description": "Building an AI-powered knowledge discovery system"
      }
    },
    "userId": "12345678-1234-1234-1234-123456789012"
  }' | jq '.' || echo "Install jq for pretty JSON output"

echo -e "\n"

# Test 4: Invalid Context (should return empty suggestions)
echo -e "${MAGENTA}═══ Test 4: Invalid Context ═══${NC}"
echo -e "${YELLOW}Testing with null values (should return empty suggestions)${NC}"
echo -e "\n${YELLOW}Response:${NC}"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "type": null,
      "id": null,
      "content": null
    }
  }' | jq '.' || echo "Install jq for pretty JSON output"

echo -e "\n"

# Performance test
echo -e "${MAGENTA}⚡ Performance Test${NC}"
echo -e "Making 5 requests and measuring response time...\n"

total_time=0
for i in {1..5}; do
    start_time=$(date +%s%N)
    
    curl -s -X POST $API_URL \
      -H "Content-Type: application/json" \
      -d '{
        "context": {
          "type": "profile",
          "id": "12345678-1234-1234-1234-123456789012",
          "content": "Test User"
        }
      }' > /dev/null
    
    end_time=$(date +%s%N)
    elapsed_time=$(( ($end_time - $start_time) / 1000000 ))
    total_time=$(( $total_time + $elapsed_time ))
    
    echo -e "${CYAN}Request $i: ${elapsed_time}ms${NC}"
done

average_time=$(( $total_time / 5 ))
echo -e "\n${GREEN}Average response time: ${average_time}ms${NC}"

echo -e "\n${MAGENTA}✨ All tests completed!${NC}"