import { Link } from 'react-router-dom'

const TERMS_CONTENT = {
  version: '1.0',
  lastUpdated: '2024-01-15',
  sections: [
    {
      title: '1. Acceptance of Terms',
      content: [
        'By accessing or using CryptoShield AI, you agree to be bound by these Terms.',
        'These Terms apply to all users.',
      ],
    },
    {
      title: '2. Description of Service',
      content: [
        'CryptoShield AI provides automated blockchain security analysis.',
        'Results are estimates, not guarantees.',
      ],
    },
    {
      title: '3. User Accounts',
      content: [
        'You must provide accurate information during registration.',
        'You are responsible for your account security.',
      ],
    },
    {
      title: '4. Acceptable Use',
      content: [
        'You agree not to use the Service for unlawful purposes.',
        'You will not attempt to reverse engineer the Service.',
      ],
    },
    {
      title: '5. Disclaimer',
      content: [
        'The Service is provided "AS IS" without warranties.',
        'Risk assessments are not guarantees of safety.',
        'Always verify before signing.',
      ],
    },
    {
      title: '6. Contact',
      content: [
        'Questions? Contact us at legal@cryptoshield.ai',
      ],
    },
  ]
}

export function Terms() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link 
            to="/settings" 
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-gray-500 mt-2">Last updated: January 15, 2024 • Version 1.0</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 lg:p-10">
            {TERMS_CONTENT.sections.map((section, index) => (
              <section key={section.title} className="mb-10 pb-8 border-b border-gray-100 last:border-0 last:pb-0">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  <span className="text-primary-600 font-mono">{index + 1}.</span> {section.title}
                </h2>
                {section.content.map((paragraph, pIndex) => (
                  <p key={pIndex} className="mb-4 text-gray-700 leading-relaxed">{paragraph}</p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}