import { NextRequest, NextResponse } from 'next/server'

interface UserFeedback {
  benchmarkName: string
  questionId: string
  userRating: number // 1-5 scale
  feedback: string
  isResultHelpful: boolean
  improvementSuggestion?: string
  timestamp: string
}

// In a real application, this would connect to a database
const feedbackStore: UserFeedback[] = []

export async function POST(request: NextRequest) {
  try {
    const {
      benchmarkName,
      questionId,
      userRating,
      feedback,
      isResultHelpful,
      improvementSuggestion
    } = await request.json()
    
    if (!benchmarkName || !questionId || userRating === undefined || isResultHelpful === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required feedback fields' },
        { status: 400 }
      )
    }

    if (userRating < 1 || userRating > 5) {
      return NextResponse.json(
        { success: false, error: 'User rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const userFeedback: UserFeedback = {
      benchmarkName,
      questionId,
      userRating,
      feedback: feedback || '',
      isResultHelpful,
      improvementSuggestion,
      timestamp: new Date().toISOString()
    }

    // Store feedback (in a real app, this would go to a database)
    feedbackStore.push(userFeedback)
    
    console.log('User feedback received:', {
      benchmark: benchmarkName,
      question: questionId,
      rating: userRating,
      helpful: isResultHelpful
    })
    
    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        feedbackId: `feedback_${Date.now()}`,
        submittedAt: userFeedback.timestamp
      }
    })
  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const benchmarkName = searchParams.get('benchmark')
    
    let filteredFeedback = feedbackStore
    
    if (benchmarkName) {
      filteredFeedback = feedbackStore.filter(f => f.benchmarkName === benchmarkName)
    }
    
    // Calculate summary statistics
    const summary = {
      totalFeedback: filteredFeedback.length,
      averageRating: filteredFeedback.length > 0 
        ? filteredFeedback.reduce((sum, f) => sum + f.userRating, 0) / filteredFeedback.length 
        : 0,
      helpfulnessRate: filteredFeedback.length > 0
        ? filteredFeedback.filter(f => f.isResultHelpful).length / filteredFeedback.length
        : 0,
      benchmarkBreakdown: Object.entries(
        filteredFeedback.reduce((acc, f) => {
          acc[f.benchmarkName] = (acc[f.benchmarkName] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      ).map(([name, count]) => ({ benchmark: name, count }))
    }
    
    return NextResponse.json({
      success: true,
      data: {
        feedback: filteredFeedback,
        summary
      }
    })
  } catch (error) {
    console.error('Feedback retrieval error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve feedback' },
      { status: 500 }
    )
  }
} 