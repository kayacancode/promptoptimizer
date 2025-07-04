# LLM Provider Integration

PromptLoop now supports multiple LLM providers for prompt optimization and evaluation:

## Supported Providers

### 1. Google Gemini (Recommended)
- **Model**: Gemini 2.0 Flash Experimental (`gemini-2.0-flash-exp`)
- **Features**: Fast, efficient, and cost-effective
- **API Key**: Get one at [Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. Anthropic Claude
- **Model**: Claude 3 Opus (`claude-3-opus-20240229`)
- **Features**: High-quality reasoning and analysis
- **API Key**: Get one at [Anthropic Console](https://console.anthropic.com/)

## Configuration

Add your API keys to `.env.local`:

```env
# Google Gemini API Key (Recommended)
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# Anthropic API Key (Optional)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Preferred provider (gemini or anthropic)
PREFERRED_LLM_PROVIDER=gemini
```

## How It Works

1. **Automatic Fallback**: If your preferred provider is unavailable, the system automatically falls back to the other provider
2. **Unified Interface**: Both providers use the same interface, making it easy to switch between them
3. **Provider Abstraction**: The `LLMProvider` class handles all provider-specific logic

## Usage in PromptLoop

The LLM providers are used for:
- **Automated Prompt Engineering (APE)**: Generating and optimizing prompt variations
- **Safety Evaluation**: Analyzing prompts for bias, toxicity, and other safety concerns
- **Response Evaluation**: Scoring the quality of AI responses

## Provider Comparison

| Feature | Gemini 2.0 Flash | Claude 3 Opus |
|---------|------------------|---------------|
| Speed | Very Fast | Moderate |
| Cost | Lower | Higher |
| Context Window | 1M tokens | 200K tokens |
| Strengths | Efficiency, Speed | Deep reasoning |

## Adding New Providers

To add a new LLM provider:

1. Create a client wrapper in `src/lib/llm/`
2. Implement the conversion logic from the unified format
3. Update `LLMProvider` to support the new provider
4. Add environment variable configuration

## Troubleshooting

- **No API Key Error**: Make sure you've added at least one API key to `.env.local`
- **Rate Limits**: Both providers have rate limits; consider implementing retry logic
- **Model Not Found**: Ensure you're using the correct model names as specified above 