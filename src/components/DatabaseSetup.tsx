'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function DatabaseSetup() {
  const [isCreating, setIsCreating] = useState(false)
  const [result, setResult] = useState<any>(null)

  const createTables = async () => {
    setIsCreating(true)
    setResult(null)

    try {
      const response = await fetch('/api/setup/init-tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to call table creation API',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Database Setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Click the button below to automatically create the necessary database tables.
        </p>
        
        <Button 
          onClick={createTables} 
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? 'Creating Tables...' : 'Create Database Tables'}
        </Button>

        {result && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={result.success ? "default" : "destructive"}>
                {result.success ? 'Success' : 'Failed'}
              </Badge>
              <span className="text-sm">{result.message}</span>
            </div>

            {result.tablesCreated && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Table Status:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(result.tablesCreated).map(([table, exists]) => (
                    <div key={table} className="flex justify-between">
                      <span>{table}:</span>
                      <Badge variant={exists ? "default" : "secondary"} className="text-xs">
                        {exists ? 'Exists' : 'Missing'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.sqlToRun && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Manual SQL (copy to Supabase):</h4>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto max-h-40">
                  {result.sqlToRun}
                </pre>
              </div>
            )}

            {result.error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                <strong>Error:</strong> {result.error}
                {result.details && (
                  <div className="mt-1 text-xs">
                    <strong>Details:</strong> {result.details}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 