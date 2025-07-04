import { NextRequest, NextResponse } from 'next/server'
import { BenchmarkManager } from '@/lib/benchmarks/benchmark-manager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const benchmark = searchParams.get('benchmark')
    
    const manager = BenchmarkManager.getInstance()
    
    if (benchmark) {
      // Get specific benchmark dataset info
      const stats = manager.getDatasetStats()
      const benchmarkStats = stats[benchmark]
      
      if (!benchmarkStats) {
        return NextResponse.json(
          { success: false, error: `Benchmark '${benchmark}' not found` },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: {
          benchmark,
          ...benchmarkStats
        }
      })
    } else {
      // Get all benchmark stats
      const stats = manager.getDatasetStats()
      
      return NextResponse.json({
        success: true,
        data: {
          benchmarks: stats,
          summary: {
            totalBenchmarks: Object.keys(stats).length,
            totalQuestions: Object.values(stats).reduce((sum, stat) => sum + stat.total, 0),
            availableBenchmarks: Object.keys(stats)
          }
        }
      })
    }
  } catch (error) {
    console.error('Benchmark results API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve benchmark results' },
      { status: 500 }
    )
  }
} 