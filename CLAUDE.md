# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plan & Review

### Before starting work
 -  Always in plan mode to make a plan
 - After get the plan, make sure you Write the plan to .claude/tasks/TASK_NAME.md.
 - The plan should be a detailed implementation plan and the reasoning behind them, as well as tasks broken down. 
 - if the task require external knowledge or certain page, also research to get latest knowledge (Use Task tool for research)
 - don't over plan, it always think MVP.
 - once you write the plan, firstly ask me to review it. Do not continue until i apporve the plan. 

 ### while implementing
 - you should update the plan as you work. 
 - after you complete tasks in the plan, you should update and append detailed descriptions of the changes you made, so following tasks can be easily hand over to other engineers. 
 

## Common Development Commands

### Development Server
```bash
npm run dev          # Start Next.js development server on port 3000
npm run build        # Build the application for production
npm start            # Start production server
npm run lint         # Run ESLint for code quality checks
```

### MCP Server (Model Context Protocol)
```bash
npm run mcp:build    # Build the MCP server TypeScript code
npm run mcp:dev      # Build and run MCP server in development
npm run mcp:start    # Start the built MCP server
```

## Project Architecture

### Core Application Structure
- **Frontend**: Next.js 15 with React 19, TypeScript, and Tailwind CSS
- **Backend**: Next.js API routes for server-side functionality
- **Database**: Supabase integration for data persistence
- **Authentication**: NextAuth.js with custom user management

### Key Components

#### AI Integration (`src/lib/`)
- **LLM Providers**: Dual provider support (Gemini 2.0 Flash Experimental as primary, Claude 3 Opus as fallback)
- **Automated Prompt Engineering (APE)**: Multi-technique optimization engine
- **LMSYS Integration**: Real-world conversation data from 1M+ conversations across 25+ LLMs
- **Safety Evaluation**: Comprehensive safety, bias, and compliance checking

#### Optimization Pipeline
1. **Context Analysis**: Analyzes surrounding code and project structure
2. **APE Engine**: Generates optimized prompt variations using exemplar selection and RL
3. **Safety Evaluation**: Multi-dimensional safety scoring with regulatory compliance
4. **Benchmark Testing**: MMLU, HellaSwag, TruthfulQA evaluation integration

#### Data Sources
- **LMSYS-Chat-1M**: 1M real conversations for pattern learning and test case generation
- **Vector Database**: Pinecone integration for prompt similarity and retrieval
- **GitHub Integration**: Repository analysis and automated PR creation

### Agent System (`src/lib/agents/`)
Multi-agent architecture with specialized roles:
- **Base Agent**: Common functionality and orchestration
- **Evaluator Agent**: Performance and quality assessment
- **Feedback Agent**: User feedback processing and learning
- **Implementation Agent**: Code generation and optimization application
- **QA Agent**: Quality assurance and testing

### MCP Server (`mcp/bestmate/`)
Model Context Protocol server for IDE integration:
- Provides BestMate optimization tools directly in Cursor IDE
- Tools: submit_prompt, get_results, apply_optimization, evaluate_prompt
- Supports real-time prompt optimization workflow within the IDE

## Environment Configuration

### Required API Keys
```env
# Primary LLM Provider (recommended)
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Fallback LLM Provider
ANTHROPIC_API_KEY=your_anthropic_api_key

# GitHub Integration
GITHUB_TOKEN=your_github_token

# Database
DATABASE_URL=your_supabase_connection_string
```

### Optional Configuration
```env
# LMSYS Dataset Integration
LMSYS_API_URL=https://api.lmsys.org/v1
LMSYS_API_KEY=your_lmsys_api_key

# Vector Database
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=your_pinecone_env
```

## Key Features and Use Cases

### Prompt Optimization Workflow
1. Submit configuration file (JSON/YAML) with prompts
2. Enable context-aware analysis for code-specific optimization
3. Run APE optimization with LMSYS pattern learning
4. Review safety evaluation and compliance status
5. Apply optimizations via automated PR creation

### Safety and Compliance
Built-in support for regulatory frameworks:
- GDPR (EU data protection)
- HIPAA (healthcare information privacy)
- SOX (financial reporting accuracy)
- Custom compliance rule definitions

### Integration Points
- **GitHub**: Repository analysis, file processing, automated PR creation
- **Supabase**: User management, optimization history, metrics storage
- **Pinecone**: Vector search for prompt similarity and retrieval
- **LMSYS**: Real-world conversation data for pattern learning

## Development Notes

### Testing
- No specific test framework configured in package.json
- Manual testing via API endpoints and UI components
- Use `npm run build` to verify TypeScript compilation

### Code Style
- TypeScript throughout the codebase
- ESLint configuration with Next.js rules
- Tailwind CSS for styling with Radix UI components
- Conventional file organization with clear separation of concerns