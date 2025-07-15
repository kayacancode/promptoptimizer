'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { HelpCircle, Target, Users, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';

export interface ClarificationData {
  primaryGoal: string;
  targetAudience: string;
  usageContext: string;
  specificRequirements: string[];
  performanceMetrics: string[];
  constraintsAndLimitations: string;
  qualityExpectations: string;
  riskTolerance: 'low' | 'medium' | 'high';
  outputFormat: string;
  additionalContext: string;
}

interface PromptClarificationProps {
  onClarificationComplete: (data: ClarificationData) => void;
  onSkip: () => void;
  initialPrompt?: string;
}

export function PromptClarification({ onClarificationComplete, onSkip, initialPrompt }: PromptClarificationProps) {
  const [step, setStep] = useState(0);
  const [clarificationData, setClarificationData] = useState<ClarificationData>({
    primaryGoal: '',
    targetAudience: '',
    usageContext: '',
    specificRequirements: [],
    performanceMetrics: [],
    constraintsAndLimitations: '',
    qualityExpectations: '',
    riskTolerance: 'medium',
    outputFormat: '',
    additionalContext: ''
  });

  const questions = [
    {
      id: 'goal',
      title: 'What is your primary goal?',
      subtitle: 'Help us understand what you want to achieve with this prompt',
      icon: Target,
      component: () => (
        <div className="space-y-4">
          <Label htmlFor="goal">Primary Goal</Label>
          <Textarea 
            id="goal"
            placeholder="e.g., Generate accurate product descriptions, Summarize technical documents, Answer customer support questions..."
            value={clarificationData.primaryGoal}
            onChange={(e) => setClarificationData(prev => ({ ...prev, primaryGoal: e.target.value }))}
            className="min-h-[100px]"
          />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Common goals include:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Content generation (articles, emails, code)</li>
              <li>Data processing and analysis</li>
              <li>Question answering and support</li>
              <li>Creative tasks (brainstorming, writing)</li>
              <li>Classification and categorization</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'audience',
      title: 'Who is the target audience?',
      subtitle: 'Understanding your audience helps optimize tone and complexity',
      icon: Users,
      component: () => (
        <div className="space-y-4">
          <Label htmlFor="audience">Target Audience</Label>
          <Select value={clarificationData.targetAudience} onValueChange={(value) => 
            setClarificationData(prev => ({ ...prev, targetAudience: value }))
          }>
            <SelectTrigger>
              <SelectValue placeholder="Select your target audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General public</SelectItem>
              <SelectItem value="technical">Technical/Professional</SelectItem>
              <SelectItem value="academic">Academic/Research</SelectItem>
              <SelectItem value="business">Business/Corporate</SelectItem>
              <SelectItem value="customer-support">Customer support</SelectItem>
              <SelectItem value="developers">Developers/Engineers</SelectItem>
              <SelectItem value="students">Students/Learners</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Textarea 
            placeholder="Additional details about your audience (optional)"
            value={clarificationData.additionalContext}
            onChange={(e) => setClarificationData(prev => ({ ...prev, additionalContext: e.target.value }))}
            className="min-h-[80px]"
          />
        </div>
      )
    },
    {
      id: 'context',
      title: 'What is the usage context?',
      subtitle: 'How and where will this prompt be used?',
      icon: HelpCircle,
      component: () => (
        <div className="space-y-4">
          <Label htmlFor="context">Usage Context</Label>
          <Textarea 
            id="context"
            placeholder="e.g., Real-time customer chat, Batch processing of documents, Interactive web application, API integration..."
            value={clarificationData.usageContext}
            onChange={(e) => setClarificationData(prev => ({ ...prev, usageContext: e.target.value }))}
            className="min-h-[100px]"
          />
          <div className="space-y-3">
            <Label>Output Format Requirements</Label>
            <div className="grid grid-cols-2 gap-3">
              {['JSON', 'Markdown', 'Plain text', 'HTML', 'CSV', 'XML', 'Code', 'Structured data'].map(format => (
                <div key={format} className="flex items-center space-x-2">
                  <Checkbox 
                    id={format}
                    checked={clarificationData.outputFormat.includes(format)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setClarificationData(prev => ({ 
                          ...prev, 
                          outputFormat: prev.outputFormat ? `${prev.outputFormat}, ${format}` : format
                        }));
                      } else {
                        setClarificationData(prev => ({ 
                          ...prev, 
                          outputFormat: prev.outputFormat.split(', ').filter(f => f !== format).join(', ')
                        }));
                      }
                    }}
                  />
                  <Label htmlFor={format} className="text-sm">{format}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'requirements',
      title: 'What are your specific requirements?',
      subtitle: 'Select the requirements that matter most to your use case',
      icon: Lightbulb,
      component: () => (
        <div className="space-y-4">
          <Label>Critical Requirements</Label>
          <div className="grid grid-cols-1 gap-3">
            {[
              'Accuracy and factual correctness',
              'Consistent output format',
              'Fast response time',
              'Handles edge cases gracefully',
              'Maintains context across conversations',
              'Follows specific style guidelines',
              'Includes proper citations/sources',
              'Avoids bias and harmful content',
              'Scalable for high volume',
              'Robust error handling'
            ].map(req => (
              <div key={req} className="flex items-center space-x-2">
                <Checkbox 
                  id={req}
                  checked={clarificationData.specificRequirements.includes(req)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setClarificationData(prev => ({ 
                        ...prev, 
                        specificRequirements: [...prev.specificRequirements, req]
                      }));
                    } else {
                      setClarificationData(prev => ({ 
                        ...prev, 
                        specificRequirements: prev.specificRequirements.filter(r => r !== req)
                      }));
                    }
                  }}
                />
                <Label htmlFor={req} className="text-sm">{req}</Label>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'metrics',
      title: 'How should we measure success?',
      subtitle: 'Choose the metrics that best reflect your quality goals',
      icon: AlertTriangle,
      component: () => (
        <div className="space-y-4">
          <Label>Performance Metrics</Label>
          <div className="grid grid-cols-1 gap-3">
            {[
              'Response accuracy',
              'JSON parsing success rate',
              'Output format compliance',
              'Response time/latency',
              'Error rate reduction',
              'User satisfaction scores',
              'Hallucination detection',
              'Bias and safety metrics',
              'Cost efficiency',
              'Throughput (requests/second)'
            ].map(metric => (
              <div key={metric} className="flex items-center space-x-2">
                <Checkbox 
                  id={metric}
                  checked={clarificationData.performanceMetrics.includes(metric)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setClarificationData(prev => ({ 
                        ...prev, 
                        performanceMetrics: [...prev.performanceMetrics, metric]
                      }));
                    } else {
                      setClarificationData(prev => ({ 
                        ...prev, 
                        performanceMetrics: prev.performanceMetrics.filter(m => m !== metric)
                      }));
                    }
                  }}
                />
                <Label htmlFor={metric} className="text-sm">{metric}</Label>
              </div>
            ))}
          </div>
          
          <div className="space-y-3 pt-4 border-t">
            <Label>Risk Tolerance</Label>
            <Select value={clarificationData.riskTolerance} onValueChange={(value: 'low' | 'medium' | 'high') => 
              setClarificationData(prev => ({ ...prev, riskTolerance: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select risk tolerance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Prioritize safety and reliability</SelectItem>
                <SelectItem value="medium">Medium - Balance innovation with safety</SelectItem>
                <SelectItem value="high">High - Accept risks for maximum performance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )
    }
  ];

  const currentQuestion = questions[step];
  const isLastStep = step === questions.length - 1;
  const canProceed = step === 0 ? clarificationData.primaryGoal.trim() !== '' : true;

  const handleNext = () => {
    if (isLastStep) {
      onClarificationComplete(clarificationData);
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const progressPercentage = ((step + 1) / questions.length) * 100;

  return (
    <Card className="p-8 max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Let's clarify your requirements</h2>
          </div>
          <p className="text-muted-foreground">
            Answer a few questions to help us optimize your prompt more effectively
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Step {step + 1} of {questions.length}</span>
            <span className="text-primary font-medium">{Math.round(progressPercentage)}% complete</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <currentQuestion.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{currentQuestion.title}</h3>
              <p className="text-sm text-muted-foreground">{currentQuestion.subtitle}</p>
            </div>
          </div>

          {/* Question Component */}
          <div className="pl-13">
            {currentQuestion.component()}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4">
          <div className="flex space-x-2">
            {step > 0 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
              Skip clarification
            </Button>
          </div>
          
          <Button 
            onClick={handleNext} 
            disabled={!canProceed}
            className="flex items-center space-x-2"
          >
            <span>{isLastStep ? 'Complete' : 'Next'}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Summary */}
        {step > 0 && (
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Your responses so far:</p>
              <div className="space-y-1">
                {clarificationData.primaryGoal && (
                  <p><strong>Goal:</strong> {clarificationData.primaryGoal.substring(0, 60)}...</p>
                )}
                {clarificationData.targetAudience && (
                  <p><strong>Audience:</strong> {clarificationData.targetAudience}</p>
                )}
                {clarificationData.specificRequirements.length > 0 && (
                  <p><strong>Requirements:</strong> {clarificationData.specificRequirements.length} selected</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
} 