import { OptimizationResult } from '@/types';

export interface ConfidenceFactors {
  changeComplexity: number;
  claudeResponseQuality: number;
  validationResults: number;
  structuralImprovements: number;
  riskFactors: number;
}

export interface ConfidenceExplanation {
  score: number;
  factors: ConfidenceFactors;
  reasoning: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export class ConfidenceScoring {
  /**
   * Calculate confidence score based on multiple factors
   */
  static calculateConfidence(
    optimizationResult: OptimizationResult,
    claudeResponse: string,
    validationPassed: boolean = true
  ): ConfidenceExplanation {
    const factors: ConfidenceFactors = {
      changeComplexity: this.analyzeChangeComplexity(optimizationResult),
      claudeResponseQuality: this.analyzeClaudeResponse(claudeResponse),
      validationResults: validationPassed ? 1.0 : 0.3,
      structuralImprovements: this.analyzeStructuralImprovements(optimizationResult),
      riskFactors: this.analyzeRiskFactors(optimizationResult)
    };

    const score = this.calculateWeightedScore(factors);
    const reasoning = this.generateReasoning(factors);
    const riskLevel = this.determineRiskLevel(score, factors);

    return {
      score,
      factors,
      reasoning,
      riskLevel
    };
  }

  /**
   * Analyze change complexity (0.0 - 1.0)
   * Lower complexity = higher confidence
   */
  private static analyzeChangeComplexity(result: OptimizationResult): number {
    const changes = result.changes || [];
    const totalChanges = changes.length;
    
    if (totalChanges === 0) return 0.5; // No changes is neutral
    
    // Analyze types of changes
    const additionsCount = changes.filter(c => c.type === 'addition').length;
    const deletionsCount = changes.filter(c => c.type === 'deletion').length;
    const modificationsCount = changes.filter(c => c.type === 'modification').length;
    
    // Calculate complexity score
    let complexityScore = 0.9; // Start high
    
    // Penalize for high number of changes
    if (totalChanges > 20) complexityScore -= 0.3;
    else if (totalChanges > 10) complexityScore -= 0.2;
    else if (totalChanges > 5) complexityScore -= 0.1;
    
    // Penalize for risky change types
    if (deletionsCount > 3) complexityScore -= 0.2;
    if (modificationsCount > additionsCount) complexityScore -= 0.1;
    
    // Analyze change content for complexity indicators
    const hasComplexChanges = changes.some(change => 
      change.description?.includes('refactor') ||
      change.description?.includes('restructure') ||
      change.description?.includes('significant')
    );
    
    if (hasComplexChanges) complexityScore -= 0.15;
    
    return Math.max(0.1, Math.min(1.0, complexityScore));
  }

  /**
   * Analyze Claude's response quality (0.0 - 1.0)
   * Higher quality indicators = higher confidence
   */
  private static analyzeClaudeResponse(response: string): number {
    let qualityScore = 0.5; // Base score
    
    // Positive indicators
    const positiveIndicators = [
      'specific improvement',
      'clear benefit',
      'best practice',
      'recommended',
      'will improve',
      'enhances',
      'optimizes',
      'follows convention'
    ];
    
    // Uncertainty indicators
    const uncertaintyIndicators = [
      'might',
      'could',
      'possibly',
      'perhaps',
      'may',
      'unclear',
      'unsure',
      'depends',
      'consider'
    ];
    
    // Count positive indicators
    const positiveCount = positiveIndicators.filter(indicator => 
      response.toLowerCase().includes(indicator)
    ).length;
    
    // Count uncertainty indicators
    const uncertaintyCount = uncertaintyIndicators.filter(indicator => 
      response.toLowerCase().includes(indicator)
    ).length;
    
    // Adjust score based on indicators
    qualityScore += (positiveCount * 0.1);
    qualityScore -= (uncertaintyCount * 0.15);
    
    // Response length and structure
    const responseLength = response.length;
    if (responseLength > 500) qualityScore += 0.1; // Detailed explanations
    if (responseLength < 100) qualityScore -= 0.2; // Too brief
    
    // Check for structured explanations
    if (response.includes('because') || response.includes('reason')) {
      qualityScore += 0.1;
    }
    
    return Math.max(0.1, Math.min(1.0, qualityScore));
  }

  /**
   * Analyze structural improvements (0.0 - 1.0)
   * Better structure = higher confidence
   */
  private static analyzeStructuralImprovements(result: OptimizationResult): number {
    const explanation = result.explanation || '';
    let structuralScore = 0.5;
    
    // Look for structural improvement keywords
    const structuralKeywords = [
      'clarity',
      'structure',
      'organization',
      'format',
      'consistency',
      'readability',
      'maintainability',
      'standard'
    ];
    
    const structuralCount = structuralKeywords.filter(keyword => 
      explanation.toLowerCase().includes(keyword)
    ).length;
    
    structuralScore += (structuralCount * 0.1);
    
    // Check for specific improvement types
    if (explanation.includes('added context')) structuralScore += 0.1;
    if (explanation.includes('improved formatting')) structuralScore += 0.1;
    if (explanation.includes('clearer instructions')) structuralScore += 0.1;
    
    return Math.max(0.1, Math.min(1.0, structuralScore));
  }

  /**
   * Analyze risk factors (0.0 - 1.0)
   * Lower risk = higher confidence
   */
  private static analyzeRiskFactors(result: OptimizationResult): number {
    const changes = result.changes || [];
    let riskScore = 0.9; // Start with low risk
    
    // High-risk change patterns
    const highRiskPatterns = [
      'delete',
      'remove',
      'significant change',
      'major modification',
      'refactor',
      'restructure'
    ];
    
    // Check for high-risk changes
    changes.forEach(change => {
      const description = change.description?.toLowerCase() || '';
      highRiskPatterns.forEach(pattern => {
        if (description.includes(pattern)) {
          riskScore -= 0.1;
        }
      });
    });
    
    // System-level changes are riskier
    const hasSystemChanges = changes.some(change => 
      change.description?.includes('system') ||
      change.description?.includes('configuration') ||
      change.description?.includes('global')
    );
    
    if (hasSystemChanges) riskScore -= 0.15;
    
    return Math.max(0.1, Math.min(1.0, riskScore));
  }

  /**
   * Calculate weighted confidence score
   */
  private static calculateWeightedScore(factors: ConfidenceFactors): number {
    const weights = {
      changeComplexity: 0.25,
      claudeResponseQuality: 0.25,
      validationResults: 0.25,
      structuralImprovements: 0.15,
      riskFactors: 0.10
    };
    
    const weightedScore = 
      factors.changeComplexity * weights.changeComplexity +
      factors.claudeResponseQuality * weights.claudeResponseQuality +
      factors.validationResults * weights.validationResults +
      factors.structuralImprovements * weights.structuralImprovements +
      factors.riskFactors * weights.riskFactors;
    
    return Math.round(weightedScore * 100) / 100;
  }

  /**
   * Generate human-readable reasoning
   */
  private static generateReasoning(factors: ConfidenceFactors): string[] {
    const reasoning: string[] = [];
    
    if (factors.changeComplexity > 0.8) {
      reasoning.push("Simple, well-defined changes with low complexity");
    } else if (factors.changeComplexity < 0.5) {
      reasoning.push("Complex changes requiring careful review");
    }
    
    if (factors.claudeResponseQuality > 0.7) {
      reasoning.push("High-quality AI analysis with clear explanations");
    } else if (factors.claudeResponseQuality < 0.5) {
      reasoning.push("AI response shows some uncertainty or lacks detail");
    }
    
    if (factors.validationResults > 0.9) {
      reasoning.push("All validation checks passed successfully");
    } else if (factors.validationResults < 0.5) {
      reasoning.push("Some validation issues detected");
    }
    
    if (factors.structuralImprovements > 0.7) {
      reasoning.push("Significant structural and clarity improvements");
    }
    
    if (factors.riskFactors < 0.6) {
      reasoning.push("Higher risk changes detected - review recommended");
    }
    
    return reasoning;
  }

  /**
   * Determine risk level based on score and factors
   */
  private static determineRiskLevel(score: number, factors: ConfidenceFactors): 'low' | 'medium' | 'high' {
    if (score < 0.5 || factors.riskFactors < 0.5) {
      return 'high';
    } else if (score < 0.75 || factors.changeComplexity < 0.6) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Convert confidence score to percentage
   */
  static toPercentage(score: number): number {
    return Math.round(score * 100);
  }
}