# LMSYS-Chat-1M Dataset Integration

This module integrates with the [LMSYS-Chat-1M dataset](https://huggingface.co/datasets/lmsys/lmsys-chat-1m) from Hugging Face, which contains 1 million real-world conversations with 25 state-of-the-art LLMs.

## Dataset Overview

- **Size**: 1,000,000 conversations
- **Models**: 25 different LLMs
- **Users**: 210,479 unique IP addresses
- **Languages**: 154 languages
- **Average turns per conversation**: 2.0
- **Data period**: April to August 2023

## How It Works

The integration fetches conversation data from the Hugging Face datasets API:

1. **API Endpoint**: Uses the Hugging Face datasets server API at `https://datasets-server.huggingface.co/api/rows`
2. **Dataset**: Accesses `lmsys/lmsys-chat-1m` dataset
3. **Fallback**: If the API is unavailable, it falls back to mock data for development

## Key Features

### 1. Conversation Fetching
- Fetches real conversations from the dataset
- Supports filtering by:
  - Domain
  - Language
  - Model
  - Rating threshold
  - Maximum number of conversations

### 2. Test Case Generation
- Converts LMSYS conversations into PromptLoop test cases
- Preserves metadata including:
  - Original model used
  - Conversation rating
  - Language
  - Timestamp
  - Domain classification

### 3. Pattern Analysis
- Analyzes conversation patterns to identify:
  - Common question structures
  - Successful prompt patterns
  - Failure indicators
  - Recommended prompt structures

## Usage in PromptLoop

The LMSYS integration is used during prompt optimization to:

1. **Learn from Real-World Data**: Analyze patterns from actual user conversations
2. **Generate Realistic Test Cases**: Create test cases based on real user queries
3. **Domain-Specific Optimization**: Tailor prompts based on domain-specific conversation patterns
4. **Quality Insights**: Use high-rated conversations to understand what works well

## Privacy and Safety

- The dataset has been redacted to protect user privacy (names appear as NAME_1, NAME_2, etc.)
- Contains OpenAI moderation API tags
- Includes both safe and unsafe conversations for research purposes

## Dataset License

When using this integration, you must comply with the [LMSYS-Chat-1M Dataset License Agreement](https://huggingface.co/datasets/lmsys/lmsys-chat-1m), which includes:

- Not attempting to identify individuals
- Using the data in compliance with all applicable laws
- Not redistributing the dataset
- Following model-specific terms when using outputs

## Technical Implementation

The integration transforms Hugging Face dataset format to our internal format:

```typescript
// Hugging Face format
{
  conversation_id: string,
  model: string,
  conversation: Array<{content: string, role: string}>,
  ...
}

// PromptLoop TestCase format
{
  input: string,
  beforeOutput: string,
  afterOutput: string,
  metadata: {
    source: 'lmsys',
    conversationId: string,
    originalModel: string,
    ...
  }
}
```

## Future Improvements

1. **Caching**: Implement local caching of frequently accessed conversations
2. **Streaming**: Support streaming large numbers of conversations
3. **Advanced Filtering**: Add more sophisticated filtering options
4. **Pattern Recognition**: Enhance pattern analysis algorithms 