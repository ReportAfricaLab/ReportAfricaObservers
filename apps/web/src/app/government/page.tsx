export default function GovernmentPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-full">For Government & NGOs</span>
          <a href="https://gov.reportafrica.africa" className="px-4 py-1.5 text-xs font-semibold text-[#0F7B6C] border border-[#0F7B6C] rounded-lg hover:bg-[#0F7B6C]/5 transition">Log In →</a>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Real-Time Civic Intelligence<br />for Decision Makers</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">Monitor citizen reports, emergencies, and hotspots across your jurisdiction — powered by Africa's largest citizen reporting network.</p>
      </div>

      {/* Features */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 mb-16">
        {[
          { icon: '⚠️', title: 'Real-Time Incidents', desc: 'See citizen-reported incidents as they happen. Filter by severity, category, and location.' },
          { icon: '🚨', title: 'SOS Emergency Feed', desc: 'Live emergency alerts from citizens. Auto-refreshes every 15 seconds.' },
          { icon: '🔥', title: 'Hotspot Detection', desc: 'Automatic detection of areas with high incident density.' },
          { icon: '📥', title: 'Export CSV & PDF', desc: 'Download incident data for official reporting. Filter by date, state, category.' },
          { icon: '🔔', title: 'Smart Alerts', desc: 'Set thresholds — get notified when incidents spike in your jurisdiction.' },
          { icon: '📊', title: 'Analytics & Trends', desc: 'Track patterns over time. Identify recurring issues before they escalate.' },
        ].map((f) => (
          <div key={f.title} className="p-6 rounded-xl border border-gray-100 hover:shadow-lg transition">
            <span className="text-2xl">{f.icon}</span>
            <h3 className="font-semibold text-gray-900 mt-3 mb-1">{f.title}</h3>
            <p className="text-sm text-gray-600">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Subscription Plans</h2>
        <p className="text-gray-500 mt-2">Start with a 30-day free trial. No credit card required.</p>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[
          { tier: 'Free Trial', price: '$0', period: '30 days', features: ['7 day history', 'View incidents', 'Basic stats'], cta: 'Start Free Trial' },
          { tier: 'Agency Basic', price: '$500', period: '/month', features: ['90 day history', 'CSV export', 'Real-time alerts', 'State filter'], cta: 'Get Started' },
          { tier: 'Agency Pro', price: '$2,000', period: '/month', features: ['1 year history', 'PDF reports', 'API access', 'Priority support', 'Trend analysis'], cta: 'Get Started', popular: true },
          { tier: 'Enterprise', price: '$5,000', period: '/month', features: ['Unlimited history', 'Multi-user seats', 'Custom integration', 'Webhook alerts', 'Dedicated support', 'Full country access'], cta: 'Get Started' },
        ].map((plan) => (
          <div key={plan.tier} className={`rounded-xl p-6 border ${plan.popular ? 'border-[#0F7B6C] ring-2 ring-[#0F7B6C]/20' : 'border-gray-200'}`}>
            {plan.popular && <p className="text-[10px] font-bold text-[#0F7B6C] mb-2">RECOMMENDED</p>}
            <h3 className="font-bold text-gray-900">{plan.tier}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">{plan.price}<span className="text-sm font-normal text-gray-500">{plan.period}</span></p>
            <ul className="mt-4 space-y-1.5 text-xs text-gray-600">
              {plan.features.map(f => <li key={f}>✓ {f}</li>)}
            </ul>
            <a href="https://gov.reportafrica.africa" className={`block mt-4 py-2 text-center text-sm font-semibold rounded-lg ${plan.popular ? 'bg-[#0F7B6C] text-white' : 'bg-gray-100 text-gray-700'}`}>
              {plan.cta}
            </a>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center bg-[#0F7B6C]/5 rounded-2xl p-10 border border-[#0F7B6C]/10">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to enhance your agency's intelligence?</h2>
        <p className="text-gray-600 mb-6">Join LASEMA, NEMA, and other agencies using ReportAfrica for real-time citizen intelligence.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="https://gov.reportafrica.africa" className="px-8 py-3 bg-[#0F7B6C] text-white font-semibold rounded-lg hover:bg-[#0B6E4F]">
            Start 30-Day Free Trial
          </a>
          <a href="https://gov.reportafrica.africa" className="px-8 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50">
            Log In to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
