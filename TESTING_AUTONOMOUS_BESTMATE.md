# Testing BestMate Autonomous Dev Tool

This guide shows you how to test all the autonomous monitoring and optimization features we just built.

## Prerequisites

1. **Run the Database Migration**
   ```bash
   # Apply the autonomous monitoring schema
   psql -d your_supabase_db -f autonomous-monitoring-migration.sql
   ```

2. **Start Your Development Server**
   ```bash
   npm run dev
   ```

3. **Get Authentication Token**
   - Sign in to your dashboard at `http://localhost:3000`
   - Open browser dev tools → Application → Local Storage
   - Copy the `supabase.auth.token` value (or use your API key)

## Testing Workflow

### 1. Connect Your App for Monitoring

**Set up monitoring for a test application:**

```bash
curl -X POST "http://localhost:3000/api/monitoring/connect" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "appIdentifier": "test-llm-app",
    "appName": "My Test LLM Application",
    "description": "Testing BestMate autonomous monitoring",
    "enableRealTimeProcessing": true,
    "issueDetectionThresholds": {
      "hallucinationConfidence": 0.7,
      "performanceThreshold": 3000,
      "errorRateThreshold": 10
    },
    "notificationSettings": {
      "emailAlerts": true,
      "webhookUrl": "https://webhook.site/YOUR_UNIQUE_URL"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "connection": {
    "appIdentifier": "test-llm-app",
    "monitoringApiKey": "bm_monitor_abc123...",
    "webhookUrl": "http://localhost:3000/api/monitoring/webhook",
    "status": "active"
  },
  "integration": {
    "curl": "curl -X POST ...",
    "javascript": "// JavaScript example...",
    "python": "# Python example..."
  }
}
```

### 2. Send Test Logs with Issues

**Test 1: Send logs with hallucination issues**

```bash
curl -X POST "http://localhost:3000/api/monitoring/webhook" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_MONITORING_API_KEY" \
  -d '{
    "appIdentifier": "test-llm-app",
    "logs": [
      {
        "content": "I am absolutely certain that the capital of Australia is Sydney, and it has always been Sydney since 1788. This is definitely a proven fact.",
        "level": "info",
        "context": {
          "model": "gpt-4",
          "responseTime": 2500,
          "tokenCount": 45,
          "requestId": "req_hallucination_test"
        }
      }
    ]
  }'
```

**Test 2: Send logs with structure errors**

```bash
curl -X POST "http://localhost:3000/api/monitoring/webhook" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_MONITORING_API_KEY" \
  -d '{
    "appIdentifier": "test-llm-app",
    "logs": [
      {
        "content": "Here is the JSON response: {\"name\": \"John\", \"age\": 30, \"city\": \"New York\" // missing closing brace",
        "level": "error",
        "context": {
          "model": "claude-3-opus",
          "responseTime": 1500,
          "tokenCount": 32,
          "requestId": "req_structure_test"
        }
      }
    ]
  }'
```

**Test 3: Send logs with performance issues**

```bash
curl -X POST "http://localhost:3000/api/monitoring/webhook" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_MONITORING_API_KEY" \
  -d '{
    "appIdentifier": "test-llm-app",
    "logs": [
      {
        "content": "Successfully processed user request with detailed analysis and comprehensive recommendations.",
        "level": "info",
        "context": {
          "model": "gpt-4",
          "responseTime": 15000,
          "tokenCount": 1200,
          "requestId": "req_performance_test"
        }
      }
    ]
  }'
```

### 3. Check Monitoring Status

**View detected issues and performance metrics:**

```bash
curl -X GET "http://localhost:3000/api/monitoring/status?appIdentifier=test-llm-app&hours=1" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "appIdentifier": "test-llm-app",
  "stats": {
    "totalLogs": 3,
    "issueCount": 2,
    "criticalIssues": 1,
    "errorRate": 33.33
  },
  "recentIssues": [
    {
      "logContent": "I am absolutely certain that the capital of Australia is Sydney...",
      "detectedIssues": [
        {
          "type": "hallucination",
          "severity": "high",
          "description": "High confidence statement about uncertain topic",
          "confidence": 0.85
        }
      ]
    }
  ],
  "systemHealth": {
    "status": "warning",
    "performanceScore": 65
  }
}
```

### 4. Test Performance Tracking

**View performance dashboard:**

```bash
curl -X GET "http://localhost:3000/api/monitoring/performance?appIdentifier=test-llm-app&hours=1&type=dashboard" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "snapshot": {
      "responseTime": {
        "avg": 6333,
        "p95": 15000
      },
      "errorRate": 33.33,
      "issueRate": 66.67,
      "qualityScore": 45.5
    },
    "alerts": [
      {
        "type": "threshold_exceeded",
        "severity": "critical",
        "message": "Average response time (6333ms) exceeds critical threshold",
        "metricType": "response_time_avg"
      }
    ],
    "recommendations": [
      "High issue rate detected - enable autonomous optimization",
      "Error rate is elevated - review recent logs for patterns"
    ]
  }
}
```

### 5. Test Autonomous Optimization

**Trigger autonomous optimization by sending a batch of problematic logs:**

```bash
# Send multiple logs with issues to trigger autonomous optimization
for i in {1..5}; do
  curl -X POST "http://localhost:3000/api/monitoring/webhook" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: YOUR_MONITORING_API_KEY" \
    -d '{
      "appIdentifier": "test-llm-app",
      "logs": [
        {
          "content": "I think the answer is probably maybe around 42, but I am definitely certain it could also be 43 or never.",
          "level": "warn",
          "context": {
            "model": "claude-3-opus",
            "responseTime": 8000,
            "tokenCount": 25,
            "requestId": "req_batch_'$i'"
          }
        }
      ]
    }'
  sleep 2
done
```

### 6. Check Autonomous Decision Results

**View autonomous optimization sessions:**

```bash
curl -X GET "http://localhost:3000/api/optimization-sessions?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Look for sessions with `session_name` containing "Autonomous" or check the `settings_used` field for autonomous context.

### 7. Test Manual Optimization

**Trigger a manual optimization with the current prompt:**

```bash
curl -X POST "http://localhost:3000/api/optimize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "prompt": "You are a helpful assistant. Answer the user question.",
    "requirements": "Avoid hallucinations and provide accurate information only. Do not make up facts."
  }'
```

### 8. Integration Testing

**Test with a Simple Python Script:**

```python
import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:3000"
API_KEY = "YOUR_MONITORING_API_KEY"
APP_ID = "python-test-app"

def send_log(content, level="info", response_time=1000):
    """Send a log entry to BestMate"""
    payload = {
        "appIdentifier": APP_ID,
        "logs": [{
            "content": content,
            "level": level,
            "context": {
                "model": "gpt-4",
                "responseTime": response_time,
                "tokenCount": len(content.split()),
                "requestId": f"test_{int(time.time())}"
            }
        }]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/monitoring/webhook",
        headers={
            "Content-Type": "application/json",
            "X-API-Key": API_KEY
        },
        json=payload
    )
    
    print(f"Sent log: {response.status_code}")
    return response.json()

def check_status():
    """Check monitoring status"""
    response = requests.get(
        f"{BASE_URL}/api/monitoring/status",
        headers={"Authorization": f"Bearer YOUR_TOKEN_HERE"},
        params={"appIdentifier": APP_ID, "hours": 1}
    )
    
    return response.json()

# Test sequence
if __name__ == "__main__":
    print("🚀 Testing BestMate Autonomous Monitoring")
    
    # Send problematic logs
    send_log("I'm absolutely certain that Python was invented in 1995 by definitely Guido van Rossum in Amsterdam.")
    send_log('{"invalid": "json" missing_brace', level="error")
    send_log("Processing completed successfully", response_time=12000)
    
    time.sleep(5)  # Wait for processing
    
    # Check results
    status = check_status()
    print(f"📊 Status: {json.dumps(status, indent=2)}")
```

**Test with JavaScript/Node.js:**

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'YOUR_MONITORING_API_KEY';
const APP_ID = 'js-test-app';

async function sendLog(content, level = 'info', responseTime = 1000) {
  try {
    const response = await axios.post(`${BASE_URL}/api/monitoring/webhook`, {
      appIdentifier: APP_ID,
      logs: [{
        content,
        level,
        context: {
          model: 'claude-3-opus',
          responseTime,
          tokenCount: content.split(' ').length,
          requestId: `test_${Date.now()}`
        }
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      }
    });
    
    console.log(`✅ Log sent: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending log:', error.message);
  }
}

async function testSequence() {
  console.log('🚀 Testing BestMate Autonomous Monitoring');
  
  // Send test logs
  await sendLog("I'm definitely sure that JavaScript was created in 1995, absolutely certain!");
  await sendLog("function broken() { return 'missing semicolon' }", 'error');
  await sendLog("Operation completed", 'info', 15000);
  
  console.log('📝 Test logs sent. Check your dashboard for results!');
}

testSequence();
```

## Expected Behavior

### What Should Happen:

1. **Log Ingestion**: Logs are successfully received and stored
2. **Issue Detection**: AI detects hallucinations, structure errors, performance issues
3. **Performance Tracking**: Metrics are calculated and stored
4. **Alerts Generated**: System generates alerts for threshold violations
5. **Autonomous Decisions**: When enough issues accumulate, autonomous optimization is triggered
6. **Learning**: System learns from each optimization attempt

### Monitoring the Results:

1. **Check Database**: Look at the new tables:
   ```sql
   SELECT * FROM monitoring_logs WHERE app_identifier = 'test-llm-app';
   SELECT * FROM performance_metrics WHERE app_identifier = 'test-llm-app';
   SELECT * FROM autonomous_optimization_sessions;
   ```

2. **Check Logs**: Watch your terminal/server logs for processing messages

3. **Webhook Notifications**: If you set up a webhook URL, you should receive notifications

## Troubleshooting

**Common Issues:**

1. **Authentication Errors**: Make sure your Bearer token is valid
2. **API Key Issues**: Ensure you're using the correct monitoring API key
3. **Database Errors**: Verify the migration was applied successfully
4. **Processing Delays**: Allow 30-60 seconds for background processing

**Debug Commands:**

```bash
# Check if tables exist
psql -d your_db -c "\dt *monitoring*"

# Check recent log entries
psql -d your_db -c "SELECT * FROM monitoring_logs ORDER BY created_at DESC LIMIT 5;"

# Check for detected issues
psql -d your_db -c "SELECT app_identifier, detected_issues FROM monitoring_logs WHERE detected_issues != '[]';"
```

This testing framework will help you verify that BestMate is successfully monitoring your applications and autonomously optimizing them! 🚀