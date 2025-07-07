/**
 * Test script for LMSYS dataset integration
 * Run with: npx tsx src/lib/lmsys/test-integration.ts
 */

import { LMSYSDatasetIntegration } from './dataset-integration'

async function testLMSYSIntegration() {

  try {
    // Test 1: Fetch conversations
    const conversations = await LMSYSDatasetIntegration.fetchConversations({
      maxConversations: 5,
      language: 'en'
    })
    
    if (conversations.length > 0) {
    }

    // Test 2: Convert to test cases
    const testCases = LMSYSDatasetIntegration.conversationsToTestCases(conversations)
    
    if (testCases.length > 0) {
    }

    // Test 3: Domain-specific test cases
    const domainTestCases = await LMSYSDatasetIntegration.generateDomainTestCases(
      'software-development',
      3
    )

    // Test 4: Pattern analysis
    const patterns = await LMSYSDatasetIntegration.analyzeConversationPatterns('general')

    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
  }
}

// Run the test
testLMSYSIntegration() 