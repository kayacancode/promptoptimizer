import { NextRequest, NextResponse } from 'next/server'
import { TestCaseGenerator } from '@/lib/test-case-generator'
import { ConfigFile } from '@/types'
import { authenticateRequest } from '@/lib/auth-middleware'
import { SupabaseAccessKeyManager } from '@/lib/supabase-access-keys'

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request)
    if (!auth.authorized) {
      return NextResponse.json({
        success: false,
        error: auth.error || 'Unauthorized'
      }, { status: 401 })
    }

    const { 
      config,
      projectContext,
      testCaseCount = 8
    } = await request.json()
    
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Config is required' },
        { status: 400 }
      )
    }

    // Create ConfigFile object
    const configFile: ConfigFile = {
      name: config.name || 'custom-config',
      type: config.type || 'markdown',
      content: config.content,
      size: config.content?.length || 0
    }

    
    // Generate project-specific test cases
    const testCases = await TestCaseGenerator.generateProjectSpecificTestCases(
      configFile,
      projectContext
    )

    // Limit to requested count
    const limitedTestCases = testCases.slice(0, testCaseCount)

    // Calculate statistics
    const stats = {
      totalGenerated: limitedTestCases.length,
      projectSpecific: limitedTestCases.filter(tc => tc.metadata?.source === 'generated').length,
      realUserData: limitedTestCases.filter(tc => tc.metadata?.source === 'lmsys').length,
      domains: [...new Set(limitedTestCases.map(tc => tc.metadata?.domain).filter(Boolean))],
      averageScore: limitedTestCases.reduce((sum, tc) => sum + tc.score, 0) / limitedTestCases.length
    }

    // Save the test case generation session to Supabase
    if (auth.userId) {
      try {
        const sessionData = {
          action: 'test-cases-generate',
          config: configFile,
          projectContext,
          testCaseCount,
          generatedCount: limitedTestCases.length,
          statistics: stats,
          timestamp: new Date().toISOString()
        }
        
        await SupabaseAccessKeyManager.saveSession(auth.userId, sessionData)
      } catch (error) {
        console.error('Failed to save test case generation session to Supabase:', error)
        // Continue execution - don't fail the request if saving fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        testCases: limitedTestCases,
        statistics: stats,
        projectContext: projectContext || 'auto-detected'
      }
    })
  } catch (error) {
    console.error('Test case generation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate test cases' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    
    // Return available domains and use cases for frontend selection
    const availableOptions = {
      domains: [
        { value: 'healthcare', label: 'Healthcare', description: 'Medical advice, patient care, wellness' },
        { value: 'education', label: 'Education', description: 'Teaching, tutoring, learning support' },
        { value: 'customer_service', label: 'Customer Service', description: 'Support, troubleshooting, satisfaction' },
        { value: 'coding', label: 'Software Development', description: 'Programming, code review, debugging' },
        { value: 'creative_writing', label: 'Creative Writing', description: 'Content creation, storytelling, editing' },
        { value: 'finance', label: 'Finance', description: 'Investment advice, financial planning, analysis' },
        { value: 'legal', label: 'Legal', description: 'Legal research, document review, compliance' },
        { value: 'marketing', label: 'Marketing', description: 'Campaigns, content strategy, analytics' }
      ],
      useCases: [
        { value: 'assistant', label: 'General Assistant', description: 'Multi-purpose AI assistant' },
        { value: 'tutoring', label: 'Tutoring', description: 'Educational support and guidance' },
        { value: 'customer_support', label: 'Customer Support', description: 'Help desk and troubleshooting' },
        { value: 'code_review', label: 'Code Review', description: 'Code analysis and improvement' },
        { value: 'content_generation', label: 'Content Generation', description: 'Creating written content' },
        { value: 'data_analysis', label: 'Data Analysis', description: 'Analyzing and interpreting data' },
        { value: 'research', label: 'Research', description: 'Information gathering and synthesis' }
      ],
      targetAudiences: [
        { value: 'general_users', label: 'General Users', description: 'Broad audience with varied backgrounds' },
        { value: 'students', label: 'Students', description: 'Learners at various educational levels' },
        { value: 'professionals', label: 'Professionals', description: 'Working professionals in specific fields' },
        { value: 'developers', label: 'Developers', description: 'Software developers and engineers' },
        { value: 'customers', label: 'Customers', description: 'End users of products or services' },
        { value: 'researchers', label: 'Researchers', description: 'Academic or industry researchers' }
      ],
      complexityLevels: [
        { value: 'beginner', label: 'Beginner', description: 'Simple explanations, basic concepts' },
        { value: 'intermediate', label: 'Intermediate', description: 'Moderate complexity, some background assumed' },
        { value: 'expert', label: 'Expert', description: 'Advanced concepts, technical depth' }
      ]
    }

    // If domain is specified, return domain-specific suggestions
    if (domain) {
      const domainSpecificOptions = getDomainSpecificOptions(domain)
      return NextResponse.json({
        success: true,
        data: {
          ...availableOptions,
          domainSpecific: domainSpecificOptions
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: availableOptions
    })
  } catch (error) {
    console.error('Test case options API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve options' },
      { status: 500 }
    )
  }
}

interface DomainSpecificOptions {
  commonUseCases: string[]
  keyTopics: string[]
  targetAudiences: string[]
}

function getDomainSpecificOptions(domain: string): DomainSpecificOptions {
  const domainOptions: Record<string, DomainSpecificOptions> = {
    healthcare: {
      commonUseCases: ['patient_consultation', 'medical_research', 'health_education'],
      keyTopics: ['diagnosis', 'treatment', 'prevention', 'medication', 'symptoms'],
      targetAudiences: ['patients', 'healthcare_providers', 'medical_students']
    },
    education: {
      commonUseCases: ['tutoring', 'curriculum_design', 'assessment'],
      keyTopics: ['pedagogy', 'learning_outcomes', 'student_engagement', 'assessment'],
      targetAudiences: ['students', 'teachers', 'parents', 'administrators']
    },
    coding: {
      commonUseCases: ['code_review', 'debugging', 'technical_documentation'],
      keyTopics: ['algorithms', 'data_structures', 'best_practices', 'performance'],
      targetAudiences: ['junior_developers', 'senior_developers', 'technical_leads']
    },
    customer_service: {
      commonUseCases: ['issue_resolution', 'product_support', 'complaint_handling'],
      keyTopics: ['customer_satisfaction', 'problem_solving', 'communication'],
      targetAudiences: ['customers', 'support_agents', 'managers']
    }
  }

  return domainOptions[domain] || {
    commonUseCases: ['general_assistance'],
    keyTopics: ['best_practices'],
    targetAudiences: ['general_users']
  }
} 