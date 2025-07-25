# BestMate MCP Server

This MCP (Model Context Protocol) server integrates BestMate's prompt optimization capabilities directly into your IDE through Cursor.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate your API key:**
   - Go to http://localhost:3000/dashboard
   - Navigate to the "API Keys" tab
   - Click "Generate API Key"
   - Copy the generated key

3. **Build the server:**
   ```bash
   npm run mcp:build
   ```

4. **Configure Cursor IDE:**
   Add to your Cursor MCP settings:
   ```json
   {
     "mcpServers": {
       "bestmate": {
         "command": "node",
         "args": ["./mcp/bestmate/dist/index.js"],
         "env": {
           "BESTMATE_API_KEY": "your-api-key"
         }
       }
     }
   }
   ```

## Available Tools

### `bestmate_submit_prompt`
Submit a prompt to BestMate for optimization analysis.
- **Input:** `prompt` (string, required)
- **Optional:** `context`, `domain`, `model`, `temperature`, `optimization_type` (all preset to sensible defaults; you do not need to provide these unless you want to override)
- **Output:** `sessionId` for tracking the optimization

> **Tip:** In Cursor, you only need to enter your prompt. All other settings are optimized for you by default.

### `bestmate_get_results`
Retrieve optimization results for a session.
- **Input:** `sessionId` (string)
- **Output:** Optimization suggestions and improvements

### `bestmate_apply_optimization`
Apply a selected optimization to your prompt.
- **Input:** `suggestionId` (string), `optimizedPrompt` (string)
- **Output:** Confirmation of applied optimization

### `bestmate_evaluate_prompt`
Evaluate a prompt for clarity, effectiveness, and specificity.
- **Input:** `prompt` (string), `context` (optional), `criteria` (optional array)
- **Output:** Evaluation scores and feedback

## Workflow

1. Select prompt text in Cursor
2. Use `bestmate_submit_prompt` to start optimization (just enter your prompt!)
3. Use `bestmate_get_results` to get suggestions
4. Use `bestmate_apply_optimization` to apply chosen improvement
5. Use `bestmate_evaluate_prompt` to get performance scores

This replicates the exact BestMate browser workflow but keeps you in your IDE!