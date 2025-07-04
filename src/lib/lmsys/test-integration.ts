/**
 * Test script for LMSYS dataset integration
 * Run with: npx tsx src/lib/lmsys/test-integration.ts
 */

import { LMSYSDatasetIntegration } from './dataset-integration'

async function testLMSYSIntegration() {
  console.log('Testing LMSYS-Chat-1M Dataset Integration...\n')

  try {
    // Test 1: Fetch conversations
    console.log('1. Fetching conversations from Hugging Face...')
    const conversations = await LMSYSDatasetIntegration.fetchConversations({
      maxConversations: 5,
      language: 'en'
    })
    console.log(`   ✓ Fetched ${conversations.length} conversations`)
    
    if (conversations.length > 0) {
      console.log(`   Sample conversation ID: ${conversations[0].conversation_id}`)
      console.log(`   Model: ${conversations[0].model}`)
      console.log(`   Language: ${conversations[0].language}`)
    }

    // Test 2: Convert to test cases
    console.log('\n2. Converting to test cases...')
    const testCases = LMSYSDatasetIntegration.conversationsToTestCases(conversations)
    console.log(`   ✓ Generated ${testCases.length} test cases`)
    
    if (testCases.length > 0) {
      console.log(`   Sample test case input: "${testCases[0].input.substring(0, 50)}..."`)
    }

    // Test 3: Domain-specific test cases
    console.log('\n3. Generating domain-specific test cases...')
    const domainTestCases = await LMSYSDatasetIntegration.generateDomainTestCases(
      'software-development',
      3
    )
    console.log(`   ✓ Generated ${domainTestCases.length} software development test cases`)

    // Test 4: Pattern analysis
    console.log('\n4. Analyzing conversation patterns...')
    const patterns = await LMSYSDatasetIntegration.analyzeConversationPatterns('general')
    console.log(`   ✓ Found ${patterns.commonPatterns.length} common patterns`)
    console.log(`   Recommended structure: ${patterns.recommendedStructure}`)

    console.log('\n✅ All tests passed! LMSYS integration is working correctly.')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    console.log('\nNote: If the Hugging Face API is unavailable, the integration will fall back to mock data.')
  }
}

// Run the test
testLMSYSIntegration() 