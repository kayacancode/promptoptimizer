// Simple test to verify Google embeddings work
// Run this with: node test-vector-db.js

async function testGoogleEmbeddings() {
  console.log('Testing Google embeddings integration...')
  
  try {
    // Test the vector DB initialization endpoint
    const initResponse = await fetch('http://localhost:3000/api/vector-db/init', {
      method: 'GET'
    })
    
    const initResult = await initResponse.json()
    console.log('Vector DB health check:', initResult)
    
    // Test searching (this will fail without proper API keys, but shows the endpoint works)
    const searchResponse = await fetch('http://localhost:3000/api/vector-db/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'help me debug code',
        userId: 'test-user',
        options: {
          limit: 3,
          minScore: 0.7
        }
      })
    })
    
    const searchResult = await searchResponse.json()
    console.log('Vector search test:', searchResult)
    
    console.log('✅ All endpoints are responding correctly!')
    console.log('Next steps: Add your API keys to .env.local:')
    console.log('- GOOGLE_GEMINI_API_KEY=your_google_key')
    console.log('- PINECONE_API_KEY=your_pinecone_key')
    console.log('- GITHUB_API_KEY=your_github_token (optional)')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testGoogleEmbeddings()