#!/bin/bash

# Test script for BestMate MCP
echo "Testing BestMate MCP endpoints..."

# You'll need to replace YOUR_API_KEY with a valid BestMate API key
API_KEY="bm_test_key_here"
BASE_URL="http://localhost:3001"

# Test 1: Submit prompt for optimization
echo "1. Testing prompt submission..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/bestmate/optimize" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a professional email to decline a meeting",
    "context": "Business communication",
    "domain": "Professional writing",
    "model": "claude-4-opus",
    "temperature": 0.3,
    "optimization_type": "comprehensive"
  }')

echo "Response: $RESPONSE"

# Extract session ID from response
SESSION_ID=$(echo $RESPONSE | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
echo "Session ID: $SESSION_ID"

if [ -n "$SESSION_ID" ]; then
  # Test 2: Get optimization results
  echo -e "\n2. Testing results retrieval..."
  sleep 2  # Give it a moment to process
  
  RESULTS=$(curl -s -X GET "$BASE_URL/api/bestmate/optimize/$SESSION_ID/results" \
    -H "Authorization: Bearer $API_KEY")
  
  echo "Results: $RESULTS"
else
  echo "No session ID received - check API key and authentication"
fi