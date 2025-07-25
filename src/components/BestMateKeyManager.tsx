'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '../../utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { toast } from 'sonner';

interface BestMateKeyManagerProps {
  className?: string;
}

export function BestMateKeyManager({ className }: BestMateKeyManagerProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const fetchApiKey = async () => {
    try {
      // Get the session token from Supabase
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Please sign in to manage API keys');
        return;
      }

      const response = await fetch('/api/bestmate/get-key', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setApiKey(data.apiKey);
        setHasApiKey(data.hasApiKey);
      } else {
        toast.error(data.error || 'Failed to fetch API key');
      }
    } catch (error) {
      toast.error('Error fetching API key');
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = async () => {
    setIsGenerating(true);
    try {
      // Get the session token from Supabase
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Please sign in to generate API keys');
        return;
      }

      const response = await fetch('/api/bestmate/generate-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setApiKey(data.apiKey);
        setHasApiKey(true);
        setShowKey(true);
        toast.success('BestMate API key generated successfully!');
      } else {
        toast.error(data.error || 'Failed to generate API key');
      }
    } catch (error) {
      toast.error('Error generating API key');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success('API key copied to clipboard!');
    }
  };

  const maskedKey = (key: string) => {
    if (key.length <= 8) return key;
    return `${key.substring(0, 8)}${'*'.repeat(key.length - 12)}${key.substring(key.length - 4)}`;
  };

  useEffect(() => {
    fetchApiKey();
  }, []);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>BestMate API Key</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>BestMate API Key</CardTitle>
        <CardDescription>
          Generate and manage your BestMate API key for use with the MCP server in Cursor IDE.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasApiKey ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Your API Key</Label>
              <div className="flex space-x-2">
                <Input
                  id="api-key"
                  type="text"
                  value={showKey ? apiKey || '' : maskedKey(apiKey || '')}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? 'Hide' : 'Show'}
                </Button>
                <Button
                  variant="outline"
                  onClick={copyToClipboard}
                >
                  Copy
                </Button>
              </div>
            </div>
            
            <Alert>
              <div className="text-sm">
                <p className="font-medium mb-2">Setup Instructions for Cursor:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Copy your API key above</li>
                  <li>Open Cursor Settings → Search for "MCP"</li>
                  <li>Add this configuration:</li>
                </ol>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "bestmate": {
      "command": "node",
      "args": ["./mcp/dist/index.js"],
      "env": {
        "BESTMATE_API_KEY": "your-api-key-here"
      }
    }
  }
}`}
                </pre>
              </div>
            </Alert>

            <Button
              variant="destructive"
              onClick={generateApiKey}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Regenerate Key'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              You don't have a BestMate API key yet. Generate one to use with the MCP server.
            </p>
            <Button
              onClick={generateApiKey}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate API Key'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}