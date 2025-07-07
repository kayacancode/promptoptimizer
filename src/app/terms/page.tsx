import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">P</span>
              </div>
              <h1 className="text-xl font-semibold">bestmate</h1>
            </Link>
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Terms of Service</h1>
            <p className="text-lg text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            <p className="text-sm text-muted-foreground">
              Please read these terms carefully before using our service.
            </p>
          </div>

          {/* Table of Contents */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Table of Contents</h2>
            <ul className="space-y-2 text-sm">
              <li><a href="#acceptance" className="text-primary hover:underline">1. Acceptance of Terms</a></li>
              <li><a href="#description" className="text-primary hover:underline">2. Description of Service</a></li>
              <li><a href="#registration" className="text-primary hover:underline">3. User Registration</a></li>
              <li><a href="#usage-limits" className="text-primary hover:underline">4. Usage Limits and Fair Use</a></li>
              <li><a href="#intellectual-property" className="text-primary hover:underline">5. Intellectual Property</a></li>
              <li><a href="#user-content" className="text-primary hover:underline">6. User Content and Data</a></li>
              <li><a href="#prohibited-uses" className="text-primary hover:underline">7. Prohibited Uses</a></li>
              <li><a href="#disclaimers" className="text-primary hover:underline">8. Disclaimers and Limitations</a></li>
              <li><a href="#termination" className="text-primary hover:underline">9. Termination</a></li>
              <li><a href="#changes" className="text-primary hover:underline">10. Changes to Terms</a></li>
              <li><a href="#contact" className="text-primary hover:underline">11. Contact Information</a></li>
            </ul>
          </Card>

          {/* Content Sections */}
          <div className="space-y-8">
            <section id="acceptance">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-muted-foreground mb-4">
                  By accessing or using bestmate ("the Service"), you agree to be bound by these Terms of Service 
                  ("Terms"). If you disagree with any part of these terms, you may not access the Service.
                </p>
                <p className="text-muted-foreground">
                  These Terms apply to all visitors, users, and others who access or use the Service.
                </p>
              </div>
            </section>

            <section id="description">
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-muted-foreground mb-4">
                  bestmate is an AI-powered prompt optimization platform that provides:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Prompt optimization using advanced AI algorithms</li>
                  <li>Performance evaluation and benchmarking</li>
                  <li>Global prompt intelligence through vector similarity</li>
                  <li>Integration with development workflows via GitHub</li>
                  <li>Usage analytics and optimization insights</li>
                </ul>
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Beta Service:</strong> This service is currently in beta. Features may change, 
                    and we cannot guarantee uninterrupted service availability.
                  </p>
                </div>
              </div>
            </section>

            <section id="registration">
              <h2 className="text-2xl font-semibold mb-4">3. User Registration</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-muted-foreground mb-4">
                  To use certain features of the Service, you must register for an account:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>You must provide accurate and complete registration information</li>
                  <li>You are responsible for maintaining the security of your account</li>
                  <li>You must immediately notify us of any unauthorized use</li>
                  <li>You may not share your account credentials with others</li>
                  <li>One account per person; multiple accounts are not permitted</li>
                </ul>
              </div>
            </section>

            <section id="usage-limits">
              <h2 className="text-2xl font-semibold mb-4">4. Usage Limits and Fair Use</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-muted-foreground mb-4">
                  The Service operates under a fair use policy with the following limits:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Beta Users:</strong> 10 optimization tokens per day</li>
                  <li><strong>Rate Limiting:</strong> API requests are subject to rate limits</li>
                  <li><strong>Resource Usage:</strong> Excessive usage may result in temporary restrictions</li>
                  <li><strong>Commercial Use:</strong> Commercial usage requires explicit permission</li>
                </ul>
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Fair Use:</strong> We reserve the right to suspend accounts that abuse the service, 
                    attempt to circumvent limits, or engage in activities that negatively impact other users.
                  </p>
                </div>
              </div>
            </section>

            <section id="intellectual-property">
              <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
              <div className="prose prose-gray max-w-none">
                <h3 className="text-lg font-medium mb-2">Our Rights</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
                  <li>The Service and its technology are owned by Forever22 Studios</li>
                  <li>Our algorithms, vector intelligence, and optimization techniques are proprietary</li>
                  <li>You may not reverse engineer, copy, or attempt to extract our technology</li>
                </ul>

                <h3 className="text-lg font-medium mb-2">Your Rights</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>You retain ownership of your original prompts and content</li>
                  <li>You own the optimized prompts generated for your specific inputs</li>
                  <li>You may use optimized prompts in your own projects and applications</li>
                </ul>
              </div>
            </section>

            <section id="user-content">
              <h2 className="text-2xl font-semibold mb-4">6. User Content and Data</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-muted-foreground mb-4">
                  By using the Service, you agree that:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>You own or have rights to all content you submit</li>
                  <li>Your prompts may be anonymized and added to our global knowledge base</li>
                  <li>We may use anonymized data to improve the Service for all users</li>
                  <li>You will not submit copyrighted, confidential, or sensitive information</li>
                  <li>You will not submit content that violates laws or regulations</li>
                </ul>
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>Data Privacy:</strong> See our{' '}
                    <Link href="/privacy" className="text-green-600 dark:text-green-400 hover:underline">
                      Privacy Policy
                    </Link>{' '}
                    for details on how we handle your data.
                  </p>
                </div>
              </div>
            </section>

            <section id="prohibited-uses">
              <h2 className="text-2xl font-semibold mb-4">7. Prohibited Uses</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-muted-foreground mb-4">
                  You may not use the Service for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Illegal activities or content that violates laws</li>
                  <li>Harassment, abuse, or hate speech</li>
                  <li>Spam, phishing, or malicious content</li>
                  <li>Attempting to hack, disrupt, or damage the Service</li>
                  <li>Creating prompts for deceptive or harmful AI applications</li>
                  <li>Circumventing usage limits or security measures</li>
                  <li>Reselling or redistributing the Service without permission</li>
                  <li>Training competing AI models using our optimizations</li>
                </ul>
              </div>
            </section>

            <section id="disclaimers">
              <h2 className="text-2xl font-semibold mb-4">8. Disclaimers and Limitations</h2>
              <div className="prose prose-gray max-w-none">
                <h3 className="text-lg font-medium mb-2">Service Availability</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
                  <li>The Service is provided "as is" without warranties</li>
                  <li>We do not guarantee continuous, uninterrupted access</li>
                  <li>Beta features may be unstable or change without notice</li>
                </ul>

                <h3 className="text-lg font-medium mb-2">AI-Generated Content</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
                  <li>Optimized prompts are suggestions, not guaranteed solutions</li>
                  <li>AI outputs may contain errors, biases, or inappropriate content</li>
                  <li>You are responsible for reviewing and validating all outputs</li>
                  <li>We are not liable for consequences of using optimized prompts</li>
                </ul>

                <h3 className="text-lg font-medium mb-2">Limitation of Liability</h3>
                <p className="text-muted-foreground">
                  Forever22 Studios shall not be liable for any indirect, incidental, special, 
                  consequential, or punitive damages arising from your use of the Service.
                </p>
              </div>
            </section>

            <section id="termination">
              <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
              <div className="prose prose-gray max-w-none">
                <h3 className="text-lg font-medium mb-2">Your Rights</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
                  <li>You may terminate your account at any time</li>
                  <li>Upon termination, you may export your data</li>
                  <li>Anonymized contributions to the global pool remain</li>
                </ul>

                <h3 className="text-lg font-medium mb-2">Our Rights</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>We may suspend or terminate accounts for Terms violations</li>
                  <li>We may discontinue the Service with reasonable notice</li>
                  <li>We may modify or restrict access to features</li>
                </ul>
              </div>
            </section>

            <section id="changes">
              <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-muted-foreground mb-4">
                  We reserve the right to modify these Terms at any time:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Changes will be posted on this page with updated date</li>
                  <li>Significant changes will be communicated via email</li>
                  <li>Continued use after changes constitutes acceptance</li>
                  <li>If you disagree with changes, you should stop using the Service</li>
                </ul>
              </div>
            </section>

            <section id="contact">
              <h2 className="text-2xl font-semibold mb-4">11. Contact Information</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-muted-foreground mb-4">
                  For questions about these Terms or the Service, contact us:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <strong>Email:</strong>{' '}
                    <a href="mailto:kaya@forver22studios.com" className="text-primary hover:underline">
                      kaya@forver22studios.com
                    </a>
                  </li>
                  <li>
                    <strong>Twitter:</strong>{' '}
                    <a href="https://twitter.com/kayacancode" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      @kayacancode
                    </a>
                  </li>
                  <li><strong>Company:</strong> Forever22 Studios</li>
                </ul>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="text-center pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              These terms are effective as of {new Date().toLocaleDateString()} and govern your use of bestmate.
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <Link href="/privacy" className="text-primary hover:underline text-sm">
                Privacy Policy
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/" className="text-primary hover:underline text-sm">
                ← Back to bestmate
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 