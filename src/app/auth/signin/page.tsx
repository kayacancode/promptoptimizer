'use client'

import { GitHubAuthManager } from '@/components/GitHubAuthManager'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to PromptLoop
          </h1>
          <p className="text-gray-600">
            Sign in to get started with AI-powered prompt optimization
          </p>
        </div>

        <GitHubAuthManager />

        <div className="mt-8 text-center">
          <a 
            href="/" 
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
} 