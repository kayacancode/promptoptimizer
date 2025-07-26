'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { createSupabaseBrowserClient } from '../../../utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Key, Code, Zap } from 'lucide-react';

export default function DevelopersPage() {
  const { data: session, status } = useSession();
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [supabaseSession, setSupabaseSession] = useState<any>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateApiKey = async () => {
    setLoading(true);
    try {
      // Get the session token from Supabase
      const supabase = createSupabaseBrowserClient();
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      
      if (!supabaseSession?.access_token) {
        console.error('Please sign in to generate API keys');
        return;
      }

      const response = await fetch('/api/bestmate/generate-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseSession.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setApiKey(data.apiKey);
      } else {
        console.error('Failed to generate API key:', data.error);
      }
    } catch (error) {
      console.error('Error generating API key:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSupabaseSession = async () => {
      try {
        // Get the session token from Supabase
        const supabase = createSupabaseBrowserClient();
        const { data: { session: currentSupabaseSession } } = await supabase.auth.getSession();
        
        setSupabaseSession(currentSupabaseSession);
        
        if (!currentSupabaseSession?.access_token) {
          return; // User not signed in to Supabase
        }

        // Fetch existing API key if user is signed in
        const response = await fetch('/api/bestmate/get-key', {
          headers: {
            'Authorization': `Bearer ${currentSupabaseSession.access_token}`
          }
        });
        
        const data = await response.json();
        if (data.success && data.apiKey) {
          setApiKey(data.apiKey);
        }
      } catch (error) {
        console.error('Error fetching session or API key:', error);
      }
    };

    // Check for session when component mounts
    checkSupabaseSession();
  }, []);

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            BestMate <span className="text-gray-700">Developer API</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Integrate advanced prompt optimization directly into your applications with our powerful API and MCP server
          </p>
          <div className="flex justify-center gap-4 mt-6">
            <Badge variant="outline" className="px-3 py-1 border-gray-300 text-gray-700">
              <Zap className="w-4 h-4 mr-1" />
              AI-Powered Optimization
            </Badge>
            <Badge variant="outline" className="px-3 py-1 border-gray-300 text-gray-700">
              <Code className="w-4 h-4 mr-1" />
              RESTful API
            </Badge>
            <Badge variant="outline" className="px-3 py-1 border-gray-300 text-gray-700">
              <Key className="w-4 h-4 mr-1" />
              Secure Authentication
            </Badge>
          </div>
        </div>

        {/* Quick Start Card */}
        <Card className="mb-8 border border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-gray-700" />
              Quick Start
            </CardTitle>
            <CardDescription>
              Get up and running with the BestMate API in minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {supabaseSession ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">1. Generate Your API Key</h4>
                  <div className="flex gap-3">
                    <Button 
                      onClick={generateApiKey} 
                      disabled={loading}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      {loading ? 'Generating...' : 'Generate API Key'}
                    </Button>
                    {apiKey && (
                      <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md">
                        <code className="text-sm font-mono">{apiKey.substring(0, 12)}...</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(apiKey)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">2. Make Your First Request</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`curl -X POST https://www.bestmate.io/api/bestmate/optimize \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Write a function to calculate fibonacci numbers",
    "context": "For a Python coding tutorial"
  }'`)}
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <pre className="text-sm overflow-x-auto">
{`curl -X POST https://www.bestmate.io/api/bestmate/optimize \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Write a function to calculate fibonacci numbers",
    "context": "For a Python coding tutorial"
  }'`}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">Sign in to generate your API key</p>
                <Button 
                  onClick={() => window.location.href = '/auth/signin?callbackUrl=' + encodeURIComponent(window.location.href)}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="endpoints" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 border border-gray-200">
            <TabsTrigger value="endpoints" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">API Endpoints</TabsTrigger>
            <TabsTrigger value="mcp" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">MCP Integration</TabsTrigger>
            <TabsTrigger value="examples" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">Code Examples</TabsTrigger>
            <TabsTrigger value="resources" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="endpoints" className="space-y-6">
            {/* Optimize Endpoint */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className="bg-gray-100 text-gray-800 border-gray-300">POST</Badge>
                  /api/bestmate/optimize
                </CardTitle>
                <CardDescription>
                  Submit a prompt for AI-powered optimization using Claude 4 Opus and Gemini 2.5
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Request Headers</h4>
                  <div className="bg-gray-100 p-3 rounded-md">
                    <code className="text-sm">Authorization: Bearer bm_your_api_key_here</code><br/>
                    <code className="text-sm">Content-Type: application/json</code>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`{
  "prompt": "Write a function to calculate fibonacci numbers",
  "context": "For a Python coding tutorial",
  "domain": "education",
  "model": "claude-4-opus",
  "temperature": 0.3,
  "optimization_type": "comprehensive"
}`)}
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <pre className="text-sm overflow-x-auto">
{`{
  "prompt": "Write a function to calculate fibonacci numbers",
  "context": "For a Python coding tutorial",
  "domain": "education",
  "model": "claude-4-opus",
  "temperature": 0.3,
  "optimization_type": "comprehensive"
}`}
                    </pre>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <strong>Required:</strong> prompt<br/>
                    <strong>Optional:</strong> context, domain, model, temperature, optimization_type
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
{`{
  "sessionId": "session_abc123def456",
  "optimizationSessionId": 42,
  "status": "processing",
  "message": "Prompt submitted for optimization",
  "config": {
    "model": "claude-4-opus",
    "temperature": 0.3,
    "optimization_type": "comprehensive",
    "context": "For a Python coding tutorial",
    "domain": "education",
    "source": "mcp"
  },
  "tokensRemaining": 99
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Endpoint */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className="bg-gray-100 text-gray-800 border-gray-300">GET</Badge>
                  /api/bestmate/optimize/[sessionId]/results
                </CardTitle>
                <CardDescription>
                  Retrieve optimization results for a specific session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Request Headers</h4>
                  <div className="bg-gray-100 p-3 rounded-md">
                    <code className="text-sm">Authorization: Bearer bm_your_api_key_here</code>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
{`{
  "sessionId": "session_abc123def456",
  "originalPrompt": "Write a function to calculate fibonacci numbers",
  "status": "completed",
  "suggestions": [
    {
      "id": "claude_4_opus_suggestion",
      "model": "claude-4-opus",
      "optimizedPrompt": "Create a Python function that efficiently calculates Fibonacci numbers...",
      "improvements": [
        "Added clear function signature and documentation",
        "Included efficiency considerations for large numbers",
        "Added error handling for edge cases"
      ],
      "reasoning": "Enhanced with proper structure and educational context",
      "hallucinationRate": 0.03,
      "structureScore": 0.95,
      "consistencyScore": 0.92,
      "confidence": 0.94
    },
    {
      "id": "gemini_2.5_suggestion",
      "model": "gemini-2.5-pro",
      "optimizedPrompt": "Design a well-documented Python function for Fibonacci calculation...",
      "improvements": [
        "Structured execution framework",
        "Added success criteria and output standards",
        "Enhanced actionability and professional delivery"
      ],
      "reasoning": "Systematic approach with clear phases and metrics",
      "hallucinationRate": 0.06,
      "structureScore": 0.86,
      "consistencyScore": 0.83,
      "confidence": 0.85
    }
  ],
  "optimizationSessionId": 42
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Evaluate Endpoint */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className="bg-gray-100 text-gray-800 border-gray-300">POST</Badge>
                  /api/bestmate/evaluate
                </CardTitle>
                <CardDescription>
                  Evaluate a prompt for clarity, effectiveness, and specificity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
{`{
  "prompt": "Write a function to calculate fibonacci numbers",
  "context": "For a Python coding tutorial",
  "criteria": ["clarity", "effectiveness", "specificity"]
}`}
                    </pre>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <strong>Required:</strong> prompt<br/>
                    <strong>Optional:</strong> context, criteria
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
{`{
  "id": "eval_abc123def456",
  "prompt": "Write a function to calculate fibonacci numbers",
  "scores": {
    "clarity": 0.87,
    "effectiveness": 0.73,
    "specificity": 0.82,
    "overall": 0.81
  },
  "feedback": "This prompt demonstrates strong foundational elements...",
  "suggestions": [
    "Add structured formatting with headers and bullet points",
    "Include specific success criteria or evaluation metrics",
    "Break down the task into clear, sequential steps"
  ]
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Responses */}
            <Card>
              <CardHeader>
                <CardTitle>Error Responses</CardTitle>
                <CardDescription>
                  Common error responses and their meanings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">401 Unauthorized</h4>
                    <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                      <code className="text-sm text-red-800">
                        {`{ "error": "Authorization header missing" }`}
                      </code>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">400 Bad Request</h4>
                    <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                      <code className="text-sm text-red-800">
                        {`{ "error": "Prompt is required" }`}
                      </code>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">403 Forbidden</h4>
                    <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                      <code className="text-sm text-red-800">
                        {`{ "error": "Insufficient tokens. Please upgrade your plan." }`}
                      </code>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">404 Not Found</h4>
                    <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                      <code className="text-sm text-red-800">
                        {`{ "error": "Session not found" }`}
                      </code>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rate Limits */}
            <Card>
              <CardHeader>
                <CardTitle>Rate Limits & Usage</CardTitle>
                <CardDescription>
                  API usage limits and token consumption
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">1 Token</div>
                    <div className="text-sm text-gray-600">per optimization</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">Free</div>
                    <div className="text-sm text-gray-600">evaluation requests</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">No Limit</div>
                    <div className="text-sm text-gray-600">on API calls</div>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-md">
                  <p className="text-sm text-gray-700">
                    <strong>Note:</strong> Each optimization request consumes 1 token from your account balance. 
                    Check your remaining tokens in the response or via the dashboard.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mcp" className="space-y-6">
            {/* MCP Overview */}
            <Card className="border border-gray-200 bg-gray-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-gray-700" />
                  Model Context Protocol (MCP) Integration
                </CardTitle>
                <CardDescription>
                  Use BestMate directly in your IDE with our published MCP server. Get prompt optimization without leaving your coding environment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-lg font-semibold text-gray-900">🚀 One Command</div>
                    <div className="text-sm text-gray-600">Global npm install</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-lg font-semibold text-gray-900">⚡ IDE Native</div>
                    <div className="text-sm text-gray-600">Works in Cursor & VS Code</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-lg font-semibold text-gray-900">🔧 Ready to Use</div>
                    <div className="text-sm text-gray-600">6 built-in tools</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Installation */}
            <Card>
              <CardHeader>
                <CardTitle>Installation</CardTitle>
                <CardDescription>
                  Install the BestMate MCP server globally via npm
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">1. Install the MCP Server</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard('npm install -g bestmate-mcp-server')}
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <pre className="text-sm">npm install -g bestmate-mcp-server</pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">2. Get Your API Key</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Generate your API key from the dashboard above, or visit{' '}
                    <a href="https://www.bestmate.io/" className="text-blue-600 hover:underline">
                      bestmate.io
                    </a>
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">3. Configure Cursor IDE</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Add this configuration to your Cursor MCP settings:
                  </p>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`{
  "mcpServers": {
    "bestmate": {
      "command": "bestmate-mcp",
      "env": {
        "BESTMATE_API_KEY": "${apiKey || 'your-api-key-here'}"
      }
    }
  }
}`)}
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <pre className="text-sm overflow-x-auto">
{`{
  "mcpServers": {
    "bestmate": {
      "command": "bestmate-mcp",
      "env": {
        "BESTMATE_API_KEY": "${apiKey || 'your-api-key-here'}"
      }
    }
  }
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Tools */}
            <Card>
              <CardHeader>
                <CardTitle>Available MCP Tools</CardTitle>
                <CardDescription>
                  Six powerful tools available directly in your IDE
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4 bg-white border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">bestmate_submit_prompt</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Submit a prompt for optimization analysis
                    </p>
                    <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                      Input: prompt (required), context, domain, model
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-white border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">bestmate_get_results</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Retrieve optimization results for a session
                    </p>
                    <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                      Input: sessionId (required)
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-white border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">bestmate_apply_optimization</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Apply a selected optimization to your prompt
                    </p>
                    <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                      Input: suggestionId, optimizedPrompt
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-white border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">bestmate_evaluate_prompt</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Evaluate prompt clarity, effectiveness, and specificity
                    </p>
                    <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                      Input: prompt (required), context, criteria
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-white border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">bestmate_optimize_selected</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Optimize selected text with automatic context detection
                    </p>
                    <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                      Input: selectedText, filePath, fileType
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-white border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">bestmate_submit_from_context</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Submit with automatic project context analysis
                    </p>
                    <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                      Input: prompt, contextFiles, projectType
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Workflow */}
            <Card>
              <CardHeader>
                <CardTitle>Typical Workflow</CardTitle>
                <CardDescription>
                  Step-by-step guide to using BestMate in your IDE
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 text-gray-900 rounded-full flex items-center justify-center font-semibold text-sm">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold">Submit Your Prompt</h4>
                      <p className="text-sm text-gray-600">
                        Use <code className="bg-gray-100 px-1 rounded">bestmate_submit_prompt</code> to send your prompt for optimization
                      </p>
                      <div className="mt-2 bg-gray-100 p-2 rounded text-xs font-mono">
                        bestmate_submit_prompt("Write a function to sort an array")
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 text-gray-900 rounded-full flex items-center justify-center font-semibold text-sm">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold">Get Results</h4>
                      <p className="text-sm text-gray-600">
                        Use the returned sessionId to retrieve optimization suggestions
                      </p>
                      <div className="mt-2 bg-gray-100 p-2 rounded text-xs font-mono">
                        bestmate_get_results("session_abc123def456")
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 text-gray-900 rounded-full flex items-center justify-center font-semibold text-sm">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold">Apply Optimization</h4>
                      <p className="text-sm text-gray-600">
                        Choose and apply your preferred optimization suggestion
                      </p>
                      <div className="mt-2 bg-gray-100 p-2 rounded text-xs font-mono">
                        bestmate_apply_optimization("claude_4_opus_suggestion", "optimized_prompt")
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 text-gray-900 rounded-full flex items-center justify-center font-semibold text-sm">
                      4
                    </div>
                    <div>
                      <h4 className="font-semibold">Evaluate Quality</h4>
                      <p className="text-sm text-gray-600">
                        Optionally evaluate your final prompt for quality metrics
                      </p>
                      <div className="mt-2 bg-gray-100 p-2 rounded text-xs font-mono">
                        bestmate_evaluate_prompt("your_final_prompt")
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Troubleshooting */}
            <Card>
              <CardHeader>
                <CardTitle>Troubleshooting</CardTitle>
                <CardDescription>
                  Common issues and solutions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="border-l-4 border-yellow-400 pl-4">
                    <h4 className="font-semibold text-yellow-700">Command not found: bestmate-mcp</h4>
                    <p className="text-sm text-gray-600">
                      Ensure you installed globally: <code className="bg-gray-100 px-1 rounded">npm install -g bestmate-mcp-server</code>
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-red-400 pl-4">
                    <h4 className="font-semibold text-red-700">Authorization header missing</h4>
                    <p className="text-sm text-gray-600">
                      Check that your API key is correctly set in the MCP configuration environment variables
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-blue-400 pl-4">
                    <h4 className="font-semibold text-blue-700">MCP server not connecting</h4>
                    <p className="text-sm text-gray-600">
                      Restart Cursor after updating the MCP configuration. Check the MCP logs for detailed error messages.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples" className="space-y-6">
            {/* JavaScript/TypeScript Examples */}
            <Card>
              <CardHeader>
                <CardTitle>JavaScript / TypeScript</CardTitle>
                <CardDescription>
                  Node.js and browser examples using fetch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Complete Optimization Workflow</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`const BESTMATE_API_KEY = '${apiKey || 'your-api-key-here'}';
const BASE_URL = 'https://www.bestmate.io/api/bestmate';

// 1. Submit prompt for optimization
async function optimizePrompt(prompt, context) {
  const response = await fetch(\`\${BASE_URL}/optimize\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${BESTMATE_API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      context,
      model: 'claude-4-opus',
      optimization_type: 'comprehensive'
    })
  });
  
  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }
  
  return await response.json();
}

// 2. Get optimization results
async function getResults(sessionId) {
  const response = await fetch(\`\${BASE_URL}/optimize/\${sessionId}/results\`, {
    headers: {
      'Authorization': \`Bearer \${BESTMATE_API_KEY}\`
    }
  });
  
  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }
  
  return await response.json();
}

// 3. Evaluate prompt quality
async function evaluatePrompt(prompt, context) {
  const response = await fetch(\`\${BASE_URL}/evaluate\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${BESTMATE_API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      context,
      criteria: ['clarity', 'effectiveness', 'specificity']
    })
  });
  
  return await response.json();
}

// Usage example
async function example() {
  try {
    // Submit for optimization
    const submission = await optimizePrompt(
      "Write a function to calculate fibonacci numbers",
      "For a Python coding tutorial"
    );
    
    console.log('Submitted:', submission.sessionId);
    
    // Get results (may need to wait/retry)
    const results = await getResults(submission.sessionId);
    console.log('Optimization suggestions:', results.suggestions);
    
    // Evaluate the optimized prompt
    const evaluation = await evaluatePrompt(
      results.suggestions[0].optimizedPrompt,
      "Educational context"
    );
    console.log('Quality scores:', evaluation.scores);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}`)}
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
{`const BESTMATE_API_KEY = '${apiKey || 'your-api-key-here'}';
const BASE_URL = 'https://www.bestmate.io/api/bestmate';

// 1. Submit prompt for optimization
async function optimizePrompt(prompt, context) {
  const response = await fetch(\`\${BASE_URL}/optimize\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${BESTMATE_API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      context,
      model: 'claude-4-opus',
      optimization_type: 'comprehensive'
    })
  });
  
  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }
  
  return await response.json();
}

// 2. Get optimization results
async function getResults(sessionId) {
  const response = await fetch(\`\${BASE_URL}/optimize/\${sessionId}/results\`, {
    headers: {
      'Authorization': \`Bearer \${BESTMATE_API_KEY}\`
    }
  });
  
  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }
  
  return await response.json();
}

// 3. Evaluate prompt quality
async function evaluatePrompt(prompt, context) {
  const response = await fetch(\`\${BASE_URL}/evaluate\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${BESTMATE_API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      context,
      criteria: ['clarity', 'effectiveness', 'specificity']
    })
  });
  
  return await response.json();
}

// Usage example
async function example() {
  try {
    // Submit for optimization
    const submission = await optimizePrompt(
      "Write a function to calculate fibonacci numbers",
      "For a Python coding tutorial"
    );
    
    console.log('Submitted:', submission.sessionId);
    
    // Get results (may need to wait/retry)
    const results = await getResults(submission.sessionId);
    console.log('Optimization suggestions:', results.suggestions);
    
    // Evaluate the optimized prompt
    const evaluation = await evaluatePrompt(
      results.suggestions[0].optimizedPrompt,
      "Educational context"
    );
    console.log('Quality scores:', evaluation.scores);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Python Examples */}
            <Card>
              <CardHeader>
                <CardTitle>Python</CardTitle>
                <CardDescription>
                  Python examples using requests library
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Python SDK Class</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`import requests
import json
from typing import Dict, List, Optional

class BestMateClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://www.bestmate.io/api/bestmate"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def optimize_prompt(self, prompt: str, context: str = "", 
                       model: str = "claude-4-opus", 
                       optimization_type: str = "comprehensive") -> Dict:
        """Submit a prompt for optimization."""
        payload = {
            "prompt": prompt,
            "context": context,
            "model": model,
            "optimization_type": optimization_type
        }
        
        response = requests.post(
            f"{self.base_url}/optimize",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
    
    def get_results(self, session_id: str) -> Dict:
        """Get optimization results for a session."""
        response = requests.get(
            f"{self.base_url}/optimize/{session_id}/results",
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        response.raise_for_status()
        return response.json()
    
    def evaluate_prompt(self, prompt: str, context: str = "", 
                       criteria: List[str] = None) -> Dict:
        """Evaluate a prompt for quality metrics."""
        if criteria is None:
            criteria = ["clarity", "effectiveness", "specificity"]
        
        payload = {
            "prompt": prompt,
            "context": context,
            "criteria": criteria
        }
        
        response = requests.post(
            f"{self.base_url}/evaluate",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()

# Usage example
def main():
    client = BestMateClient("${apiKey || 'your-api-key-here'}")
    
    try:
        # Submit for optimization
        result = client.optimize_prompt(
            prompt="Write a function to calculate fibonacci numbers",
            context="For a Python coding tutorial"
        )
        
        print(f"Session ID: {result['sessionId']}")
        
        # Get optimization results
        results = client.get_results(result['sessionId'])
        print(f"Found {len(results['suggestions'])} suggestions")
        
        for i, suggestion in enumerate(results['suggestions']):
            print(f"\\nSuggestion {i+1} ({suggestion['model']}):")
            print(f"Confidence: {suggestion['confidence']:.2%}")
            print(f"Optimized: {suggestion['optimizedPrompt'][:100]}...")
        
        # Evaluate the best suggestion
        best_prompt = results['suggestions'][0]['optimizedPrompt']
        evaluation = client.evaluate_prompt(best_prompt)
        
        print(f"\\nEvaluation scores:")
        for metric, score in evaluation['scores'].items():
            print(f"  {metric}: {score:.2%}")
            
    except requests.exceptions.RequestException as e:
        print(f"API Error: {e}")

if __name__ == "__main__":
    main()`)}
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
{`import requests
import json
from typing import Dict, List, Optional

class BestMateClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://www.bestmate.io/api/bestmate"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def optimize_prompt(self, prompt: str, context: str = "", 
                       model: str = "claude-4-opus", 
                       optimization_type: str = "comprehensive") -> Dict:
        """Submit a prompt for optimization."""
        payload = {
            "prompt": prompt,
            "context": context,
            "model": model,
            "optimization_type": optimization_type
        }
        
        response = requests.post(
            f"{self.base_url}/optimize",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
    
    def get_results(self, session_id: str) -> Dict:
        """Get optimization results for a session."""
        response = requests.get(
            f"{self.base_url}/optimize/{session_id}/results",
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        response.raise_for_status()
        return response.json()
    
    def evaluate_prompt(self, prompt: str, context: str = "", 
                       criteria: List[str] = None) -> Dict:
        """Evaluate a prompt for quality metrics."""
        if criteria is None:
            criteria = ["clarity", "effectiveness", "specificity"]
        
        payload = {
            "prompt": prompt,
            "context": context,
            "criteria": criteria
        }
        
        response = requests.post(
            f"{self.base_url}/evaluate",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()

# Usage example
def main():
    client = BestMateClient("${apiKey || 'your-api-key-here'}")
    
    try:
        # Submit for optimization
        result = client.optimize_prompt(
            prompt="Write a function to calculate fibonacci numbers",
            context="For a Python coding tutorial"
        )
        
        print(f"Session ID: {result['sessionId']}")
        
        # Get optimization results
        results = client.get_results(result['sessionId'])
        print(f"Found {len(results['suggestions'])} suggestions")
        
        for i, suggestion in enumerate(results['suggestions']):
            print(f"\\nSuggestion {i+1} ({suggestion['model']}):")
            print(f"Confidence: {suggestion['confidence']:.2%}")
            print(f"Optimized: {suggestion['optimizedPrompt'][:100]}...")
        
        # Evaluate the best suggestion
        best_prompt = results['suggestions'][0]['optimizedPrompt']
        evaluation = client.evaluate_prompt(best_prompt)
        
        print(f"\\nEvaluation scores:")
        for metric, score in evaluation['scores'].items():
            print(f"  {metric}: {score:.2%}")
            
    except requests.exceptions.RequestException as e:
        print(f"API Error: {e}")

if __name__ == "__main__":
    main()`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* cURL Examples */}
            <Card>
              <CardHeader>
                <CardTitle>cURL Commands</CardTitle>
                <CardDescription>
                  Command-line examples for testing and integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Submit Prompt for Optimization</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`curl -X POST https://www.bestmate.io/api/bestmate/optimize \\
  -H "Authorization: Bearer ${apiKey || 'your-api-key-here'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Write a function to calculate fibonacci numbers",
    "context": "For a Python coding tutorial",
    "model": "claude-4-opus",
    "optimization_type": "comprehensive"
  }'`)}
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <pre className="text-sm overflow-x-auto">
{`curl -X POST https://www.bestmate.io/api/bestmate/optimize \\
  -H "Authorization: Bearer ${apiKey || 'your-api-key-here'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Write a function to calculate fibonacci numbers",
    "context": "For a Python coding tutorial",
    "model": "claude-4-opus",
    "optimization_type": "comprehensive"
  }'`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Get Optimization Results</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`curl -X GET https://www.bestmate.io/api/bestmate/optimize/session_abc123def456/results \\
  -H "Authorization: Bearer ${apiKey || 'your-api-key-here'}"`)}
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <pre className="text-sm overflow-x-auto">
{`curl -X GET https://www.bestmate.io/api/bestmate/optimize/session_abc123def456/results \\
  -H "Authorization: Bearer ${apiKey || 'your-api-key-here'}"`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Evaluate Prompt Quality</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`curl -X POST https://www.bestmate.io/api/bestmate/evaluate \\
  -H "Authorization: Bearer ${apiKey || 'your-api-key-here'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Write a function to calculate fibonacci numbers",
    "context": "For educational purposes",
    "criteria": ["clarity", "effectiveness", "specificity"]
  }'`)}
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <pre className="text-sm overflow-x-auto">
{`curl -X POST https://www.bestmate.io/api/bestmate/evaluate \\
  -H "Authorization: Bearer ${apiKey || 'your-api-key-here'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Write a function to calculate fibonacci numbers",
    "context": "For educational purposes",
    "criteria": ["clarity", "effectiveness", "specificity"]
  }'`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Handling Examples */}
            <Card>
              <CardHeader>
                <CardTitle>Error Handling Best Practices</CardTitle>
                <CardDescription>
                  How to handle common errors gracefully
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">JavaScript Error Handling</h4>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
{`async function safeOptimizePrompt(prompt, context) {
  try {
    const response = await fetch(\`\${BASE_URL}/optimize\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${BESTMATE_API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, context })
    });
    
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your authentication.');
    }
    
    if (response.status === 403) {
      throw new Error('Insufficient tokens. Please upgrade your plan.');
    }
    
    if (response.status === 400) {
      const error = await response.json();
      throw new Error(\`Bad request: \${error.error}\`);
    }
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Optimization failed:', error.message);
    
    // Handle specific error types
    if (error.message.includes('Invalid API key')) {
      // Redirect to API key generation
      return { error: 'AUTH_ERROR', message: error.message };
    }
    
    if (error.message.includes('Insufficient tokens')) {
      // Show upgrade modal
      return { error: 'QUOTA_ERROR', message: error.message };
    }
    
    // Generic error handling
    return { error: 'UNKNOWN_ERROR', message: error.message };
  }
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            {/* NPM Package */}
            <Card className="border border-gray-200 bg-gray-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className="bg-gray-100 text-gray-800 border-gray-300">NPM</Badge>
                  BestMate MCP Server
                </CardTitle>
                <CardDescription>
                  Official MCP server package for IDE integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">bestmate-mcp-server</div>
                    <div className="text-sm text-gray-600">Global npm package for Cursor & VS Code</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">v1.0.2</Badge>
                  </div>
                </div>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-md">
                  <code className="text-sm">npm install -g bestmate-mcp-server</code>
                </div>
                <a 
                  href="https://www.npmjs.com/package/bestmate-mcp-server" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:underline text-sm"
                >
                  View on npm →
                </a>
              </CardContent>
            </Card>

            {/* GitHub Repository */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className="bg-gray-100 text-gray-800 border-gray-300">GitHub</Badge>
                  Source Code
                </CardTitle>
                <CardDescription>
                  Open source repository and issue tracking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Main Repository</h4>
                    <a 
                      href="https://github.com/kayacancode/promptoptimizer" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      github.com/kayacancode/promptoptimizer →
                    </a>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">MCP Server Code</h4>
                    <a 
                      href="https://github.com/kayacancode/promptoptimizer/tree/main/mcp/bestmate" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      /mcp/bestmate directory →
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Status & Monitoring */}
            <Card>
              <CardHeader>
                <CardTitle>API Status & Performance</CardTitle>
                <CardDescription>
                  Real-time API status and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-3 h-3 bg-gray-900 rounded-full mx-auto mb-2"></div>
                    <div className="font-semibold text-gray-900">API Status</div>
                    <div className="text-sm text-gray-600">Operational</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-lg font-bold text-gray-900">~2.5s</div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-lg font-bold text-gray-900">99.9%</div>
                    <div className="text-sm text-gray-600">Uptime</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support & Community */}
            <Card>
              <CardHeader>
                <CardTitle>Support & Community</CardTitle>
                <CardDescription>
                  Get help and connect with other developers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Developer Support</h4>
                    <div className="space-y-2">
                      <div>
                        <strong className="text-sm">Documentation Issues:</strong>
                        <div className="text-sm text-gray-600">
                          <a href="https://github.com/kayacancode/promptoptimizer/issues" className="text-blue-600 hover:underline">
                            GitHub Issues
                          </a>
                        </div>
                      </div>
                      <div>
                        <strong className="text-sm">API Questions:</strong>
                        <div className="text-sm text-gray-600">
                          <a href="mailto:support@bestmate.io" className="text-blue-600 hover:underline">
                            support@bestmate.io
                          </a>
                        </div>
                      </div>
                      <div>
                        <strong className="text-sm">Feature Requests:</strong>
                        <div className="text-sm text-gray-600">
                          <a href="https://github.com/kayacancode/promptoptimizer/discussions" className="text-blue-600 hover:underline">
                            GitHub Discussions
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Useful Links</h4>
                    <div className="space-y-2">
                      <div>
                        <a href="https://www.bestmate.io/" className="text-blue-600 hover:underline text-sm">
                          🌐 BestMate Dashboard
                        </a>
                      </div>
                      <div>
                        <a href="https://cursor.sh/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                          💻 Cursor IDE
                        </a>
                      </div>
                      <div>
                        <a href="https://modelcontextprotocol.io/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                          📖 MCP Documentation
                        </a>
                      </div>
                      <div>
                        <a href="https://www.npmjs.com/package/bestmate-mcp-server" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                          📦 NPM Package
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Changelog & Updates */}
            <Card>
              <CardHeader>
                <CardTitle>Changelog & Updates</CardTitle>
                <CardDescription>
                  Recent updates and version history
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="border-l-4 border-green-400 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">v1.0.2</Badge>
                      <span className="text-sm text-gray-500">Latest</span>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Updated README with correct webapp URL</li>
                      <li>• Improved error handling in MCP server</li>
                      <li>• Added TypeScript configuration</li>
                    </ul>
                  </div>
                  
                  <div className="border-l-4 border-blue-400 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">v1.0.1</Badge>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Fixed build process for npm distribution</li>
                      <li>• Added proper binary executable configuration</li>
                      <li>• Enhanced package metadata</li>
                    </ul>
                  </div>
                  
                  <div className="border-l-4 border-purple-400 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">v1.0.0</Badge>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Initial release of BestMate MCP server</li>
                      <li>• Support for Claude 4 Opus and Gemini 2.5 optimization</li>
                      <li>• 6 core MCP tools for prompt optimization</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}