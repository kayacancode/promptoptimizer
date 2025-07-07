'use client'

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ArrowRight, 
  Upload, 
  Play, 
  BarChart3, 
  Settings,
  CheckCircle2,
  FileText,
  GitBranch,
  Zap,
  Code2,
  Info,
  List,
  RefreshCw
} from 'lucide-react';
import { TestCaseUploader } from '@/components/TestCaseUploader';
import { BenchmarkSelector } from '@/components/BenchmarkSelector';
import { EvalResults } from '@/components/EvalResults';
import { PromptInput } from '@/components/PromptInput';
import { SafetyEvaluation } from '@/components/SafetyEvaluation';
import { UserAuthComponent } from '@/components/UserAuthManager';
import { TestCase, BenchmarkConfig, EvaluationResult, ConfigFile, OptimizationResult } from '@/types';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  const [userTestCases, setUserTestCases] = useState<TestCase[]>([]);
  const [benchmarkConfigs, setBenchmarkConfigs] = useState<BenchmarkConfig[]>([
    { name: 'MMLU', enabled: false, sampleSize: 20, fullDataset: false },
    { name: 'HellaSwag', enabled: false, sampleSize: 20, fullDataset: false },
    { name: 'TruthfulQA', enabled: false, sampleSize: 20, fullDataset: false }
  ]);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [gitHubConnected, setGitHubConnected] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ConfigFile | null>(null);
  const [originalConfig, setOriginalConfig] = useState<ConfigFile | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [includeContext, setIncludeContext] = useState(true);
  const [showDiff, setShowDiff] = useState(false);
  


  // Enhanced diff renderer function
  const renderDiff = (original: string, optimized: string) => {
    if (!original || !optimized) {
      return <div className="text-muted-foreground">No content to compare</div>;
    }

    // Handle identical content
    if (original === optimized) {
      return <div className="text-muted-foreground">No changes detected</div>;
    }

    // Simple word-level diff
    const originalWords = original.split(/(\s+)/);
    const optimizedWords = optimized.split(/(\s+)/);
    
    // Simple LCS-based diff (basic implementation)
    const result = [];
    let i = 0, j = 0;
    
    while (i < originalWords.length || j < optimizedWords.length) {
      if (i >= originalWords.length) {
        // Only optimized words left (additions)
        result.push(
          <span key={`add-${j}`} className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 rounded">
            {optimizedWords[j]}
          </span>
        );
        j++;
      } else if (j >= optimizedWords.length) {
        // Only original words left (deletions)
        result.push(
          <span key={`del-${i}`} className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-1 rounded line-through">
            {originalWords[i]}
          </span>
        );
        i++;
      } else if (originalWords[i] === optimizedWords[j]) {
        // Words match
        result.push(<span key={`same-${i}-${j}`}>{originalWords[i]}</span>);
        i++;
        j++;
      } else {
        // Words differ - mark as deletion and addition
        result.push(
          <span key={`del-${i}`} className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-1 rounded line-through mr-1">
            {originalWords[i]}
          </span>
        );
        result.push(
          <span key={`add-${j}`} className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 rounded">
            {optimizedWords[j]}
          </span>
        );
        i++;
        j++;
      }
    }
    
    return <div className="whitespace-pre-wrap leading-relaxed">{result}</div>;
  };

  const steps = [
    { id: 1, name: 'Input Prompt', icon: FileText, completed: gitHubConnected },
    { id: 2, name: 'Upload Test Cases', icon: Upload, completed: userTestCases.length > 0 },
    { id: 3, name: 'Configure Settings', icon: Settings, completed: benchmarkConfigs.some(c => c.enabled) || includeContext },
    { id: 4, name: 'Optimize Prompt', icon: Zap, completed: optimizationResult !== null },
    { id: 5, name: 'Run Evaluation', icon: Play, completed: evaluationResult !== null },
    { id: 6, name: 'View Results', icon: BarChart3, completed: false }
  ];

  const runOptimization = async () => {
    setIsRunning(true);
    try {
      // Use the selected file or create a mock one
      const configToOptimize = selectedFile || {
        name: 'config.json',
        type: 'json' as const,
        content: JSON.stringify({ model: 'gpt-4', temperature: 0.7 }),
        size: 100
      };
      
      // Get the current user session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Please sign in to continue');
      }

      // Only optimize the prompt (fast step) with global prompt insights
      const optimizeResponse = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          configFile: configToOptimize,
          includeContext,
          userId: session.user.id,
          useGlobalPrompts: true, // Enable global prompt pool
          enableAPE: true,
          enableSafetyEvaluation: true,
          enableLMSYSIntegration: true,
          complianceFrameworks: ['GDPR', 'HIPAA'],
          apeConfig: {
            domain: 'general',
            useCase: 'assistant',
            exemplarCount: 5,
            diversityThreshold: 0.3,
            iterationLimit: 2,
            reinforcementLearning: true
          }
        })
      });

      const optimizeResult = await optimizeResponse.json();
      if (!optimizeResult.success) {
        throw new Error(optimizeResult.error || 'Optimization failed');
      }

      setOriginalConfig(configToOptimize);
      setOptimizationResult(optimizeResult.data);
      setCurrentStep(4.5); // New intermediate step to show optimized prompt
    } catch (error) {
      console.error('Optimization error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runEvaluation = async () => {
    if (!optimizationResult) return;
    
    setIsRunning(true);
    try {
      // Get the current user session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Please sign in to continue');
      }

      // Run evaluation on the optimized prompt
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          originalConfig: originalConfig,
          optimizationResult: optimizationResult,
          userTestCases: userTestCases.length > 0 ? userTestCases : undefined,
          includeBenchmarks: benchmarkConfigs.some(c => c.enabled),
          benchmarkConfigs: benchmarkConfigs.filter(c => c.enabled),
          skipTestCaseGeneration: userTestCases.length === 0
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setEvaluationResult(result.data);
        setCurrentStep(6);
      }
    } catch (error) {
      console.error('Evaluation error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -inset-10 opacity-50">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
                <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
                <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
              </div>
              
              {/* Grid pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-transparent">
                <div className="absolute inset-0" style={{
                  backgroundImage: `linear-gradient(rgba(147, 51, 234, 0.1) 1px, transparent 1px),
                                   linear-gradient(90deg, rgba(147, 51, 234, 0.1) 1px, transparent 1px)`,
                  backgroundSize: '50px 50px'
                }}></div>
              </div>
            </div>

            <div className="relative z-10 container mx-auto px-6 py-8">
              {/* Top Navigation */}
              <nav className="flex items-center justify-between mb-16">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center p-1">
                    <Image 
                      src="/logo.png" 
                      alt="bestmate logo" 
                      width={32}
                      height={32}
                      className="object-contain rounded-lg"
                    />
                  </div>
                  <span className="text-white text-xl font-semibold">bestmate</span>
                </div>
                <div className="flex items-center space-x-6">
                  {/* <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a> */}
                  <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
                  <Button variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white">
                    Sign In
                  </Button>
                </div>
              </nav>

              <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
                {/* Left Column - Content */}
                <div className="space-y-8">
                  <div className="space-y-6">
                    <div className="inline-flex items-center px-4 py-2 bg-purple-900/50 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                      Now in Beta
                    </div>
                    
                    <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                      <span className="text-white">Optimize, </span>
                      <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">test,</span>
                      <br />
                      <span className="text-white">and </span>
                      <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">deploy</span>
                      <br />
                      <span className="text-gray-400 text-4xl lg:text-5xl">automatically</span>
                    </h1>
                    
                    <p className="text-xl text-gray-300 max-w-lg leading-relaxed">
                      Complete automated workflow: optimize prompts, run benchmark tests, and create PRs to integrate improvements directly into your codebase.
                      <span className="text-red-400 font-semibold"> Reduce costs by 50%</span> with zero manual work.
                    </p>
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      size="lg"
                      className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0 px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-red-500/25 transition-all"
                      onClick={() => {
                        document.getElementById('auth-section')?.scrollIntoView({ 
                          behavior: 'smooth',
                          block: 'center'
                        });
                      }}
                    >
                      Start Optimizing
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white px-8 py-6 text-lg font-semibold rounded-xl"
                    >
                      View Demo
                      <Play className="ml-2 h-5 w-5" />
                    </Button>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center space-x-8 pt-8">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">50%</div>
                      <div className="text-sm text-gray-400">Cost Reduction</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">10k+</div>
                      <div className="text-sm text-gray-400">Prompts Optimized</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">99%</div>
                      <div className="text-sm text-gray-400">Accuracy</div>
                    </div>
                  </div>
                </div>

                {/* Right Column - UI Mockup */}
                <div className="relative">
                  <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-purple-500/20 shadow-2xl overflow-hidden">
                    {/* Window chrome */}
                    <div className="flex items-center px-6 py-4 bg-slate-800 border-b border-purple-500/20">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="flex-1 text-center">
                        <div className="bg-slate-700 rounded-lg px-4 py-1 text-gray-300 text-sm max-w-xs mx-auto">
                          bestmate.io/optimize
                        </div>
                      </div>
                    </div>

                    {/* App content */}
                    <div className="p-6 space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-semibold">Prompt Optimization</h3>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-green-400 text-sm">Live</span>
                        </div>
                      </div>

                      {/* Input section */}
                      <div className="bg-slate-700 rounded-lg p-4 space-y-3">
                        <div className="text-gray-300 text-sm font-medium">Original Prompt</div>
                        <div className="bg-slate-800 rounded p-3 text-gray-400 text-sm font-mono">
                          Analyze this code and suggest improvements
                        </div>
                      </div>

                      {/* Output section */}
                      <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg p-4 space-y-3 border border-purple-500/20">
                        <div className="flex items-center justify-between">
                          <div className="text-purple-300 text-sm font-medium">Auto-Optimized & Tested</div>
                          <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Ready for PR</div>
                        </div>
                        <div className="bg-slate-800 rounded p-3 text-green-400 text-sm font-mono">
                          Perform a comprehensive code analysis focusing on: performance bottlenecks, security vulnerabilities, and maintainability issues. Provide specific, actionable recommendations with examples.
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        <div className="bg-slate-700 rounded-lg p-3 text-center">
                          <div className="text-green-400 font-bold">✓</div>
                          <div className="text-gray-400 text-xs">Tested</div>
                        </div>
                        <div className="bg-slate-700 rounded-lg p-3 text-center">
                          <div className="text-blue-400 font-bold">PR</div>
                          <div className="text-gray-400 text-xs">Ready</div>
                        </div>
                        <div className="bg-slate-700 rounded-lg p-3 text-center">
                          <div className="text-purple-400 font-bold">Auto</div>
                          <div className="text-gray-400 text-xs">Deploy</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating elements */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-20 blur-xl animate-pulse"></div>
                  <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full opacity-20 blur-xl animate-pulse animation-delay-2000"></div>
                </div>
              </div>

              {/* The Complete Loop Section */}
              <div className="mt-16 max-w-2xl mx-auto">
                <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 shadow-2xl">
                  <h3 className="text-2xl font-semibold text-white mb-6 text-center flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-purple-400 mr-3" />
                    The Complete Loop
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold">1</div>
                      <div>
                        <h4 className="font-semibold text-white">Optimize</h4>
                        <span className="text-sm">AI-powered prompt enhancement with vector intelligence</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">2</div>
                      <div>
                        <h4 className="font-semibold text-white">Test</h4>
                        <span className="text-sm">Benchmark testing & performance metrics validation</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">3</div>
                      <div>
                        <h4 className="font-semibold text-white">Deploy</h4>
                        <span className="text-sm">Automatic PR creation to integrate into codebase</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold">4</div>
                      <div>
                        <h4 className="font-semibold text-white">Learn</h4>
                        <span className="text-sm">Results feed back to improve future optimizations</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auth Section */}
              <div id="auth-section" className="mt-12 max-w-md mx-auto">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl [&_.text-muted-foreground]:text-gray-200 [&_.text-sm]:text-gray-200 [&_.text-xs]:text-gray-300 [&_h2]:text-white [&_h3]:text-white [&_label]:text-white [&_p]:text-gray-200 [&_input]:bg-white/20 [&_input]:border-white/30 [&_input]:text-white [&_input::placeholder]:text-gray-300 [&_button]:bg-white/20 [&_button]:hover:bg-white/30 [&_button]:border-white/30">
                  <UserAuthComponent />
                </div>
                <div className="text-center mt-8">
                  <Button 
                    onClick={() => setCurrentStep(1)}
                    className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0 px-8 py-4 text-lg font-semibold rounded-xl"
                  >
                    Continue to Prompt Optimization
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <PromptInput
            onFileSelect={(file: ConfigFile) => {
              setSelectedFile(file);
              setGitHubConnected(true);
              setCurrentStep(2);
            }}
          />
        );
      case 2:
        return (
          <TestCaseUploader
            testCases={userTestCases}
            onTestCasesChange={setUserTestCases}
            onRunTests={() => setCurrentStep(4)}
            isRunning={false}
          />
        );
      case 3:
        return (
          <div className="space-y-6">
            {/* Context Analysis Toggle */}
            <Card className="p-6 card-elevated">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Code2 className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Code Context Analysis</h3>
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Analyze surrounding code to provide context-aware prompt optimizations
                    </p>
                  </div>
                  <Switch
                    checked={includeContext}
                    onCheckedChange={setIncludeContext}
                  />
                </div>
                
                {includeContext && (
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Info className="h-4 w-4 text-primary mt-0.5" />
                      <div className="text-sm space-y-2">
                        <p className="font-medium">Context analysis will examine:</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>Functions and variables near your prompts</li>
                          <li>How prompts are used in your code</li>
                          <li>Import statements and dependencies</li>
                          <li>Whether prompts are in loops or conditionals</li>
                        </ul>
                        <p className="text-xs text-muted-foreground mt-2">
                          This leads to more accurate, use-case specific optimizations
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Benchmark Selector */}
            <BenchmarkSelector
              configs={benchmarkConfigs}
              onChange={setBenchmarkConfigs}
              isRunning={false}
            />
          </div>
        );
      case 4:
        return (
          <Card className="p-12 text-center card-elevated">
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Ready to Optimize</h2>
                <p className="text-muted-foreground">
                  We'll optimize your prompts and run comprehensive tests
                </p>
              </div>
              
              <div className="space-y-3 mb-8">
                {selectedFile && (
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                )}
                {includeContext && (
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <span className="text-sm font-medium">Context Analysis</span>
                    <Code2 className="h-4 w-4 text-primary" />
                  </div>
                )}
                {userTestCases.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <span className="text-sm font-medium">{userTestCases.length} Test Cases</span>
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                )}
                {benchmarkConfigs.filter(c => c.enabled).length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <span className="text-sm font-medium">
                      {benchmarkConfigs.filter(c => c.enabled).length} Benchmarks
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                )}
                {/* Global Prompt Pool Indicator */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="flex -space-x-1">
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">1</div>
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs text-white">2</div>
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs text-white">3</div>
                    </div>
                    <span className="text-sm font-medium text-blue-800">Global Prompt Insights</span>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    AI Enhanced
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={runOptimization}
                  disabled={isRunning}
                  className="w-full btn-primary"
                  size="lg"
                >
                  {isRunning ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Optimizing Prompt...</span>
                    </div>
                  ) : (
                    <>
                      Optimize Prompt
                      <Zap className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        );
      case 4.5:
        return optimizationResult ? (
          <div className="space-y-6">
            {/* Optimized Prompt Display */}
            <Card className="p-6 card-elevated">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Zap className="h-5 w-5 text-primary mr-2" />
                    Prompt Optimized Successfully!
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800">
                      {Math.round((optimizationResult.confidence || 0) * 100)}% Improvement
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (optimizationResult.optimizedContent) {
                          try {
                            await navigator.clipboard.writeText(optimizationResult.optimizedContent);
                          } catch (err) {
                            console.error('Failed to copy to clipboard:', err);
                          }
                        }
                      }}
                    >
                      Copy Optimized Prompt
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Diff View Toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">View Mode</Label>
                    <div className="flex gap-2">
                      <Button 
                        variant={showDiff ? "outline" : "default"} 
                        size="sm"
                        onClick={() => setShowDiff(false)}
                      >
                        Side by Side
                      </Button>
                      <Button 
                        variant={showDiff ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setShowDiff(true)}
                      >
                        Diff View
                      </Button>
                    </div>
                  </div>

                  {!showDiff ? (
                    /* Side by Side View */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Original</Label>
                        <div className="p-3 bg-secondary rounded-lg text-sm font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                          {optimizationResult.originalContent || 'No original content available'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Optimized</Label>
                        <div className="p-3 bg-primary/10 rounded-lg text-sm font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                          {optimizationResult.optimizedContent || 'No optimized content available'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Diff View */
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Changes</Label>
                      <div className="p-3 bg-secondary rounded-lg text-sm font-mono max-h-64 overflow-y-auto">
                        {optimizationResult.originalContent === optimizationResult.optimizedContent ? (
                          <div className="text-center text-muted-foreground py-4">
                            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No changes detected in this optimization.</p>
                            <p className="text-xs mt-1">The prompt may already be well-optimized.</p>
                          </div>
                        ) : (
                          renderDiff(optimizationResult.originalContent, optimizationResult.optimizedContent)
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Explanation Section */}
                {optimizationResult.explanation && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-semibold flex items-center">
                      <Info className="h-4 w-4 mr-2" />
                      Explanation of Changes
                    </h4>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {optimizationResult.explanation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Changes Summary */}
                {optimizationResult.changes && optimizationResult.changes.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-semibold flex items-center">
                      <List className="h-4 w-4 mr-2" />
                      Summary of Changes
                    </h4>
                    <div className="space-y-2">
                      {optimizationResult.changes.map((change, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            change.type === 'addition' ? 'bg-green-500' :
                            change.type === 'deletion' ? 'bg-red-500' :
                            'bg-blue-500'
                          }`} />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium capitalize">{change.type}</p>
                            <p className="text-sm text-muted-foreground">{change.description}</p>
                            {change.reasoning && (
                              <p className="text-xs text-muted-foreground italic">
                                {change.reasoning}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(2)}
                    >
                      Try Different Prompt
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOptimizationResult(null);
                        setCurrentStep(4);
                      }}
                    >
                      Re-optimize
                    </Button>
                  </div>
                  <Button 
                    onClick={runEvaluation}
                    disabled={isRunning}
                    className="btn-primary"
                  >
                    {isRunning ? (
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Running Evaluation... (takes 1-2 min)</span>
                      </div>
                    ) : (
                      <>
                        Run Performance Evaluation
                        <Play className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ) : null;
      case 5:
        return (
          <Card className="p-6 card-elevated">
            <div className="space-y-6 text-center">
              <div>
                <h3 className="text-lg font-semibold mb-2">Ready to Evaluate Performance</h3>
                <p className="text-muted-foreground">
                  Your prompt has been optimized. Now let's test its performance against your test cases and benchmarks.
                </p>
              </div>

              <div className="space-y-4">
                {selectedFile && (
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <span className="text-sm font-medium">Optimized Prompt Ready</span>
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                )}
                {userTestCases.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <span className="text-sm font-medium">{userTestCases.length} Test Cases</span>
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                )}
                {benchmarkConfigs.filter(c => c.enabled).length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <span className="text-sm font-medium">
                      {benchmarkConfigs.filter(c => c.enabled).length} Benchmarks
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(4.5)}
                >
                  Review Optimized Prompt
                </Button>
                <Button 
                  onClick={runEvaluation}
                  disabled={isRunning}
                  className="btn-primary"
                >
                  {isRunning ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Running Evaluation... (takes 1-2 min)</span>
                    </div>
                  ) : (
                    <>
                      Run Performance Evaluation
                      <Play className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        );
      case 6:
        return evaluationResult ? (
          <div className="space-y-8">
            {/* Optimized Prompt Display */}
            {optimizationResult && (
              <Card className="p-6 card-elevated">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Zap className="h-5 w-5 text-primary mr-2" />
                      Optimized Prompt
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-green-100 text-green-800">
                        {Math.round((optimizationResult.confidence || 0) * 100)}% Improvement
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          if (optimizationResult.optimizedContent) {
                            try {
                              await navigator.clipboard.writeText(optimizationResult.optimizedContent);
                            } catch (err) {
                              console.error('Failed to copy to clipboard:', err);
                            }
                          }
                        }}
                      >
                        Copy Optimized Prompt
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Diff View Toggle */}
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">View Mode</Label>
                      <div className="flex gap-2">
                        <Button 
                          variant={showDiff ? "outline" : "default"} 
                          size="sm"
                          onClick={() => setShowDiff(false)}
                        >
                          Side by Side
                        </Button>
                        <Button 
                          variant={showDiff ? "default" : "outline"} 
                          size="sm"
                          onClick={() => setShowDiff(true)}
                        >
                          Diff View
                        </Button>
                      </div>
                    </div>

                    {!showDiff ? (
                      /* Side by Side View */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground">Original</Label>
                          <div className="p-3 bg-secondary rounded-lg text-sm font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                            {optimizationResult.originalContent || 'No original content available'}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-muted-foreground">Optimized</Label>
                          <div className="p-3 bg-primary/10 rounded-lg text-sm font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                            {optimizationResult.optimizedContent || 'No optimized content available'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Diff View */
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Changes</Label>
                        <div className="p-3 bg-secondary rounded-lg text-sm font-mono max-h-64 overflow-y-auto">
                          {optimizationResult.originalContent === optimizationResult.optimizedContent ? (
                            <div className="text-center text-muted-foreground py-4">
                              <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No changes detected in this optimization.</p>
                              <p className="text-xs mt-1">The prompt may already be well-optimized.</p>
                            </div>
                          ) : (
                            renderDiff(optimizationResult.originalContent, optimizationResult.optimizedContent)
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Explanation Section */}
                  {optimizationResult.explanation && (
                    <div className="space-y-3 pt-4 border-t">
                      <h4 className="text-sm font-semibold flex items-center">
                        <Info className="h-4 w-4 mr-2" />
                        Explanation of Changes
                      </h4>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          {optimizationResult.explanation}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Changes Summary */}
                  {optimizationResult.changes && optimizationResult.changes.length > 0 && (
                    <div className="space-y-3 pt-4 border-t">
                      <h4 className="text-sm font-semibold flex items-center">
                        <List className="h-4 w-4 mr-2" />
                        Summary of Changes
                      </h4>
                      <div className="space-y-2">
                        {optimizationResult.changes.map((change, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              change.type === 'addition' ? 'bg-green-500' :
                              change.type === 'deletion' ? 'bg-red-500' :
                              'bg-blue-500'
                            }`} />
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium capitalize">{change.type}</p>
                              <p className="text-sm text-muted-foreground">{change.description}</p>
                              {change.reasoning && (
                                <p className="text-xs text-muted-foreground italic">
                                  {change.reasoning}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEvaluationResult(null);
                          setCurrentStep(2);
                        }}
                      >
                        Run Another Test
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBenchmarkConfigs(configs => 
                            configs.map(c => ({ ...c, enabled: true, fullDataset: true }))
                          );
                          setCurrentStep(3);
                        }}
                      >
                        Run Full Benchmark
                      </Button>
                    </div>
                    <Button 
                      className="btn-primary"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/create-pr', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              optimizationResult,
                              configFile: selectedFile || originalConfig
                            })
                          });
                          
                          const result = await response.json();
                          if (result.success) {
                            window.open(result.data.pullRequestUrl, '_blank');
                          } else {
                            console.error('Failed to create PR:', result.error);
                          }
                        } catch (error) {
                          console.error('PR creation error:', error);
                        }
                      }}
                    >
                      Create Pull Request
                      <GitBranch className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Safety Evaluation Results */}
            {optimizationResult?.advancedFeatures?.safetyEvaluation && (
              <SafetyEvaluation evaluation={{
                overall_score: (
                  optimizationResult.advancedFeatures.safetyEvaluation.biasScore +
                  optimizationResult.advancedFeatures.safetyEvaluation.toxicityScore +
                  optimizationResult.advancedFeatures.safetyEvaluation.privacyScore +
                  optimizationResult.advancedFeatures.safetyEvaluation.complianceScore
                ) / 4,
                toxicity_score: optimizationResult.advancedFeatures.safetyEvaluation.toxicityScore,
                bias_score: optimizationResult.advancedFeatures.safetyEvaluation.biasScore,
                privacy_score: optimizationResult.advancedFeatures.safetyEvaluation.privacyScore,
                harmful_content_score: optimizationResult.advancedFeatures.safetyEvaluation.toxicityScore * 0.8,
                misinformation_score: optimizationResult.advancedFeatures.safetyEvaluation.explainabilityScore,
                compliance_score: optimizationResult.advancedFeatures.safetyEvaluation.complianceScore,
                details: {
                  flags: [
                    ...optimizationResult.advancedFeatures.safetyEvaluation.details.biasAnalysis.map(desc => ({
                      type: 'bias',
                      severity: 'medium' as const,
                      description: desc,
                      location: 'prompt',
                      suggestion: 'Review and adjust for potential bias'
                    })),
                    ...optimizationResult.advancedFeatures.safetyEvaluation.details.toxicityAnalysis.map(desc => ({
                      type: 'toxicity',
                      severity: 'high' as const,
                      description: desc,
                      location: 'prompt',
                      suggestion: 'Remove or rephrase potentially toxic content'
                    })),
                    ...optimizationResult.advancedFeatures.safetyEvaluation.details.privacyAnalysis.map(desc => ({
                      type: 'privacy',
                      severity: 'medium' as const,
                      description: desc,
                      location: 'prompt',
                      suggestion: 'Ensure no personal information is exposed'
                    }))
                  ],
                  recommendations: optimizationResult.advancedFeatures.safetyEvaluation.recommendations,
                  risk_level: optimizationResult.advancedFeatures.safetyEvaluation.overall === 'safe' ? 'low' :
                              optimizationResult.advancedFeatures.safetyEvaluation.overall === 'warning' ? 'medium' : 'high'
                }
              }} />
            )}

            <EvalResults
              result={evaluationResult}
              onRunAgain={() => {
                setEvaluationResult(null);
                setCurrentStep(2);
              }}
              onRunFullBenchmark={() => {
                setBenchmarkConfigs(configs => 
                  configs.map(c => ({ ...c, enabled: true, fullDataset: true }))
                );
                setCurrentStep(3);
              }}
            />
          </div>
        ) : null;
    }
  };

  return (
    <div className={currentStep === 0 ? "min-h-screen" : "min-h-screen bg-background"}>
      {/* Header - only show when not on landing page */}
      {currentStep !== 0 && (
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center p-1">
                <Image 
                  src="/logo.png" 
                  alt="bestmate logo" 
                  width={24}
                  height={24}
                  className="object-contain rounded"
                />
              </div>
                <h1 className="text-xl font-semibold">bestmate</h1>
            </div>
              <Badge variant="secondary" className="text-xs">
                Beta
              </Badge>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={currentStep === 0 ? "" : "container mx-auto px-6 py-8 max-w-6xl"}>
        {/* Progress Steps - only show when not on landing page */}
        {currentStep !== 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between relative">
              {/* Progress Line */}
              <div className="absolute left-0 right-0 top-5 h-0.5 bg-border" />
              <div 
                className="absolute left-0 top-5 h-0.5 bg-primary transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              />
              
              {/* Step Indicators */}
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep || step.completed;
                
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`relative z-10 flex flex-col items-center group ${
                      step.id <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'
                    }`}
                    disabled={step.id > currentStep && !steps[step.id - 2]?.completed}
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                      ${isActive ? 'bg-primary text-primary-foreground scale-110 shadow-lg' : 
                        isCompleted ? 'bg-primary text-primary-foreground' : 
                        'bg-card border-2 border-border text-muted-foreground'}
                    `}>
                      {isCompleted && !isActive ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={`
                      mt-2 text-xs font-medium transition-colors whitespace-nowrap
                      ${isActive ? 'text-foreground' : 
                        isCompleted ? 'text-foreground' : 'text-muted-foreground'}
                    `}>
                      {step.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className={currentStep === 0 ? "" : "animate-in slide-in-from-bottom-4 duration-500"}>
          {renderStepContent()}
        </div>

        {/* Navigation */}
        {currentStep < 4 && currentStep > 1 && (
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!steps[currentStep - 1].completed}
              className="btn-primary text-white"
            >
              {currentStep === 3 ? 'Start Evaluation' : 'Next'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        {currentStep === 2 && userTestCases.length === 0 && (
          <div className="mt-8 p-4 bg-secondary/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-3">
              No test cases? No problem! Skip to configuration to use benchmarks only.
            </p>
            <Button
              variant="outline"
              onClick={() => setCurrentStep(3)}
              size="sm"
            >
              Skip to Configuration
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}