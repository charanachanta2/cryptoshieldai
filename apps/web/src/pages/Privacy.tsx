import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

const PRIVACY_CONTENT = {
  version: '1.0',
  lastUpdated: '2024-01-15',
  sections: [
    {
      title: '1. Information We Collect',
      content: [
        'We collect information you provide directly to us, including when you create an account, use our services, or contact us for support.',
        'Account Information: Email address, display name, password (hashed), and account preferences.',
        'Usage Data: Information about how you interact with our services, including scan requests, feature usage, and error logs.',
        'Blockchain Data: Public blockchain addresses, transaction hashes, and contract addresses you submit for analysis. We do not store private keys or seed phrases.',
        'Technical Data: IP address, browser type, device information, and access times for security and analytics.',
      ],
    },
    {
      title: '2. How We Use Your Information',
      content: [
        'To provide, maintain, and improve our security analysis services.',
        'To authenticate and manage your account.',
        'To send service-related communications, including verification emails and security alerts.',
        'To analyze usage patterns and improve our models and services.',
        'To detect and prevent fraud, abuse, and security threats.',
        'To comply with legal obligations and enforce our Terms of Service.',
      ],
    },
    {
      title: '3. Data Sharing and Disclosure',
      content: [
        'We do not sell your personal information to third parties.',
        'We may share data with trusted service providers who assist in operating our services (e.g., email delivery, cloud hosting), subject to confidentiality agreements.',
        'We may disclose information if required by law, regulation, or valid legal request.',
        'We may share aggregated, anonymized data for research and analytics purposes.',
        'In the event of a merger or acquisition, your data may be transferred as part of the business.',
      ],
    },
    {
      title: '4. Data Security',
      content: [
        'We implement appropriate technical and organizational measures to protect your data, including encryption in transit (TLS 1.2+) and at rest (AES-256).',
        'Passwords are hashed using Argon2id with high memory and time costs.',
        'JWT tokens are used for authentication with short-lived access tokens and rotating refresh tokens.',
        'Regular security assessments and penetration testing are conducted.',
        'No system is 100% secure. We encourage you to use strong passwords and enable MFA when available.',
      ],
    },
    {
      title: '5. Data Retention',
      content: [
        'Account data is retained while your account is active and for a reasonable period thereafter for legal compliance.',
        'Scan results and analysis data are retained for your reference unless you request deletion.',
        'Inactive accounts may be anonymized after 24 months of inactivity.',
        'You may request data deletion at any time by contacting us.',
      ],
    },
    {
      title: '6. Your Rights',
      content: [
        'Access: You can request a copy of your personal data.',
        'Rectification: You can correct inaccurate or incomplete data.',
        'Erasure: You can request deletion of your data (subject to legal obligations).',
        'Restriction: You can request limitation of processing.',
        'Portability: You can request your data in a portable format.',
        'Objection: You can object to certain processing activities.',
        'To exercise these rights, contact us at privacy@cryptoshield.ai',
      ],
    },
    {
      title: '7. Cookies and Tracking',
      content: [
        'We use essential cookies for authentication and session management.',
        'We may use analytics cookies to understand usage patterns (with your consent).',
        'You can control cookies through your browser settings, but disabling essential cookies may break functionality.',
      ],
    },
    {
      title: '8. Third-Party Services',
      content: [
        'Our service integrates with external APIs including Etherscan, CoinGecko, and blockchain RPC providers.',
        'These services have their own privacy policies. We recommend reviewing them.',
        'We do not control third-party data practices.',
      ],
    },
    {
      title: '9. Children\'s Privacy',
      content: [
        'Our services are not intended for individuals under 18 years of age.',
        'We do not knowingly collect personal information from children under 18.',
        'If you believe a child has provided us with personal information, please contact us immediately.',
      ],
    },
    {
      title: '10. Changes to This Policy',
      content: [
        'We may update this Privacy Policy from time to time.',
        'Material changes will be communicated via email or prominent notice on our service.',
        'Your continued use after changes constitutes acceptance of the new policy.',
      ],
    },
    {
      title: '11. Contact Us',
      content: [
        'For questions about this Privacy Policy or our data practices, contact us at:',
        'Email: privacy@cryptoshield.ai',
        'Address: CryptoShield AI, Security Division',
      ],
    },
  ]
}

export function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link 
            to="/settings" 
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-500 mt-2">Last updated: January 15, 2024 • Version 1.0</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <nav className="border-b border-gray-100 bg-gray-50 px-6 py-4 sticky top-0 z-10">
            <ol className="flex flex-wrap gap-4 overflow-x-auto pb-2">
              {PRIVACY_CONTENT.sections.map((section, index) => (
                <li key={section.title}>
                  <a 
                    href={`#section-${index + 1}`}
                    className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    {index + 1}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          
          <div className="p-6 lg:p-10">
            {PRIVACY_CONTENT.sections.map((section, index) => (
              <section 
                key={section.title} 
                id={`section-${index + 1}`}
                className="mb-10 pb-8 border-b border-gray-100 last:border-0 last:pb-0"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-primary-600 font-mono">{index + 1}.</span>
                  {section.title}
                </h2>
                <div className="prose prose-gray max-w-none text-gray-700">
                  {section.content.map((paragraph, pIndex) => (
                    <p key={pIndex} className="mb-4 leading-relaxed">{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
            
            <div className="mt-10 pt-8 border-t border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Questions?</h2>
              <p className="text-gray-600 mb-4">
                If you have questions about this Privacy Policy or our data practices, contact us at 
                <a href="mailto:privacy@cryptoshield.ai" className="text-primary-600 hover:underline">privacy@cryptoshield.ai</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}