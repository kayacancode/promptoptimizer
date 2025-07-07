import { DatabaseSetup } from '@/components/DatabaseSetup'

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            PromptLoop Setup
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Welcome to PromptLoop! This page helps you set up your database tables automatically.
            If you're getting database errors, use the tool below to create the necessary tables.
          </p>
        </div>

        <div className="flex justify-center">
          <DatabaseSetup />
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">What This Does</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>Automatic Setup:</strong> The app will try to create tables automatically when you sign up. 
              If that fails, you can use the button above.
            </p>
            <p>
              <strong>Tables Created:</strong>
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li><code>users</code> - Stores user profile information</li>
              <li><code>user_tokens</code> - Manages daily token usage and limits</li>
              <li><code>user_prompts</code> - Stores prompt history</li>
              <li><code>user_sessions</code> - Manages user session data</li>
            </ul>
            <p>
              <strong>Fallback:</strong> If automatic creation fails, you'll get SQL code to run manually 
              in your Supabase dashboard's SQL editor.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a 
            href="/" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            ← Back to App
          </a>
        </div>
      </div>
    </div>
  )
} 