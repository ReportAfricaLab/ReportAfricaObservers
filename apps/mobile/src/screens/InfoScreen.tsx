import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

const PAGES: Record<string, { title: string; content: () => React.ReactNode }> = {
  About: {
    title: 'About ReportAfrica',
    content: () => (
      <>
        <Section title="Our Mission">
          ReportAfrica is Africa's citizen-powered live reporting platform. We empower everyday Africans to document, share, and verify events happening in their communities in real time — from traffic incidents and emergencies to government accountability and elections.
        </Section>
        <Section title="Our Story">
          Born out of the need for trustworthy, real-time information across Africa, ReportAfrica was built to give citizens a voice. Traditional media often can't cover the breadth of events happening across the continent. We bridge that gap by turning every citizen into a verified reporter.
        </Section>
        <Section title="Coverage">
          ReportAfrica operates across 32+ African countries including Nigeria, Ghana, Kenya, South Africa, Egypt, Morocco, Ethiopia, Tanzania, and many more.
        </Section>
      </>
    ),
  },
  HowItWorks: {
    title: 'How It Works',
    content: () => (
      <>
        {[
          { num: '1', title: 'Sign Up', desc: 'Create your free account in seconds.' },
          { num: '2', title: 'Report an Incident', desc: 'Add details, photos or video. Location is captured automatically.' },
          { num: '3', title: 'AI Verification', desc: 'Our AI moderates and assigns a verification level.' },
          { num: '4', title: 'Community Verification', desc: 'Nearby citizens confirm or dispute your report.' },
          { num: '5', title: 'Build Trust', desc: 'Accurate reports earn trust points and unlock features.' },
          { num: '6', title: 'Earn & Impact', desc: 'Media houses can license your content. Your reporting makes a difference.' },
        ].map((step) => (
          <View key={step.num} style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{step.num}</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </>
    ),
  },
  FAQ: {
    title: 'FAQ',
    content: () => (
      <>
        {[
          { q: 'Is it free to use?', a: 'Yes! Creating an account, submitting reports, and viewing the feed is completely free.' },
          { q: 'Can I report anonymously?', a: 'Yes. Toggle anonymous mode when creating a report. Your identity will be hidden.' },
          { q: 'How do trust scores work?', a: 'You earn points for accurate reports and verifications. Points are deducted for flagged content.' },
          { q: 'How do donations work?', a: 'Verified users can create campaigns. Donors contribute via Paystack. Campaigns are reviewed for fraud.' },
          { q: 'Can media houses use my content?', a: 'Yes! Through Media Licensing, news organizations can license your reports. You earn 50% of the fee.' },
          { q: 'What countries are supported?', a: '32+ African countries including Nigeria, Ghana, Kenya, South Africa, Egypt, and more.' },
        ].map((item) => (
          <View key={item.q} style={styles.faqItem}>
            <Text style={styles.faqQ}>{item.q}</Text>
            <Text style={styles.faqA}>{item.a}</Text>
          </View>
        ))}
      </>
    ),
  },
  Guidelines: {
    title: 'Community Guidelines',
    content: () => (
      <>
        <Section title="✅ Do">
          {`• Report only what you personally witness\n• Provide accurate location and details\n• Verify other reports honestly\n• Respect privacy — use face blur\n• Report emergencies to authorities first`}
        </Section>
        <Section title="❌ Don't">
          {`• Submit false or misleading reports\n• Post hate speech or incitement to violence\n• Harass or doxx other users\n• Spam with duplicate content\n• Manipulate trust scores\n• Create fraudulent campaigns\n• Upload, share, or distribute pornographic, sexually explicit, or nude content — this results in an immediate permanent ban`}
        </Section>
        <Section title="Enforcement">
          Violations result in warnings, temporary suspensions, or permanent bans depending on severity.
        </Section>
      </>
    ),
  },
  Privacy: {
    title: 'Privacy Policy',
    content: () => (
      <>
        <Section title="Introduction">
          ReportAfrica is owned, operated, and managed by TRADILINK AFRICA SOLUTION LIMITED, a company duly incorporated under the laws of the Federal Republic of Nigeria. This Privacy Policy explains how we collect, use, store, share, and protect personal data when you access or use reportafrica.africa, mobile applications, APIs and related services.
        </Section>
        <Section title="Information We Collect">
          Account info (name, username, email, phone, password, country, profile photo), content you provide (reports, photos, videos, comments, business listings, livestreams), location data (GPS with permission), device and technical data (IP, device type, OS, browser), payment and financial data (processed by secure third-party providers), and verification documents where required.
        </Section>
        <Section title="How We Use Your Data">
          To provide and operate the platform, publish and distribute content, verify reports and reduce misinformation, rank trust and reputation scores, prevent fraud/spam/abuse, process payments and payouts, enable creator monetization, deliver local news and alerts, improve platform performance, and comply with legal obligations.
        </Section>
        <Section title="AI and Automated Systems">
          ReportAfrica uses AI to detect spam and fake content, identify harmful reports, assist moderation teams, rank content relevance, and improve platform safety. Automated systems assist but do not replace human decision-making.
        </Section>
        <Section title="Anonymous Reporting">
          When you report anonymously, your identity is completely decoupled from the report. We support face blur, EXIF metadata stripping, and zero-knowledge architecture for anonymous submissions.
        </Section>
        <Section title="Data Sharing">
          We do NOT sell personal data. We share with service providers (cloud, analytics, security), payment partners (for transactions), and legal authorities (when required by law).
        </Section>
        <Section title="Your Rights">
          You may access, correct, delete your data, withdraw consent, object to processing, request portability, or lodge complaints with regulators. Requests can be submitted through our support channels.
        </Section>
        <Section title="Data Security">
          We use encryption in transit, secure server infrastructure, password hashing, access controls, and monitoring systems. No system is 100% secure.
        </Section>
        <Section title="Contact">
          TRADILINK AFRICA SOLUTION LIMITED{"\n"}Website: reportafrica.africa{"\n"}Email: privacy@reportafrica.africa{"\n"}Support: support@reportafrica.africa{"\n"}Head Office: Federal Republic of Nigeria
        </Section>
      </>
    ),
  },
  Terms: {
    title: 'Terms of Service',
    content: () => (
      <>
        <Section title="Effective Date">June 2026</Section>
        <Section title="1. Introduction">
          ReportAfrica is a citizen journalism, community reporting, local news, business announcements, campus journalism, events, education, and creator monetization platform operating across Africa. Owned and operated by TRADILINK AFRICA SOLUTION LIMITED, incorporated under the laws of the Federal Republic of Nigeria. These Terms govern your use of reportafrica.africa, mobile applications, APIs and related services. By using ReportAfrica, you agree to be legally bound by these Terms.
        </Section>
        <Section title="2. Eligibility">
          You must be at least 16 years old (or minimum legal age in your country), have legal capacity to enter binding agreements, and not be prohibited from using the platform under applicable laws.
        </Section>
        <Section title="3. Account Security">
          You agree to provide accurate information, keep credentials secure, accept responsibility for all account activity, and notify us immediately of unauthorized access. We are not liable for losses from unauthorized use.
        </Section>
        <Section title="4. User Content">
          You may post reports, articles, photos, videos, comments, business listings, events, audio, and livestreams. You retain ownership but grant ReportAfrica a worldwide, non-exclusive, royalty-free license to use, store, reproduce, distribute, display, and promote your content. You are solely responsible for content you post.
        </Section>
        <Section title="5. Content Restrictions">
          {`You agree NOT to post content that:\n• Contains hate speech, harassment, or discrimination\n• Incites violence or criminal activity\n• Is false, misleading, or deliberately manipulative\n• Violates privacy or intellectual property rights\n• Contains explicit sexual content (especially involving minors)\n• Promotes fraud, scams, or deceptive practices\n• Contains spam, unsolicited advertising, or malware\n• Attempts to manipulate trust scores or rankings`}
        </Section>
        <Section title="6. Trust System">
          ReportAfrica uses a trust and verification system powered by automated tools and human moderation. It may rank content by credibility, promote verified reports, reduce visibility of spam, and restrict violating accounts. Trust scores are internal metrics and may be adjusted at any time.
        </Section>
        <Section title="7. Moderation & Enforcement">
          We may remove/restrict content, suspend/terminate accounts, limit access, and investigate suspicious activity — with or without prior notice for fraud, misinformation, legal violations, or security risks.
        </Section>
        <Section title="8. Payments & Monetization">
          We support donations, tips, creator earnings, subscriptions, advertising payments, course purchases, and wallet transactions via third-party providers. Payments are generally non-refundable. We are not responsible for disputes between users and creators. We may delay payouts for fraud prevention.
        </Section>
        <Section title="9. Advertising">
          ReportAfrica may display sponsored posts, ads, brand campaigns, and promoted content. Advertisers are responsible for their content. We may moderate or remove ads that violate our policies.
        </Section>
        <Section title="10. Intellectual Property">
          All platform logos, design systems, software, branding, and features are owned by or licensed to TRADILINK AFRICA SOLUTION LIMITED. You may not copy, modify, distribute, or reverse-engineer any part of the platform.
        </Section>
        <Section title="11. AI & Automated Systems">
          We use AI to detect fake news/spam, flag harmful content, improve ranking, and support moderation. These systems assist but do not fully replace human moderation.
        </Section>
        <Section title="12. Privacy">
          Your use is also governed by our Privacy Policy available at reportafrica.africa.
        </Section>
        <Section title="13. Third-Party Services">
          We integrate with payment providers, cloud infrastructure, analytics tools, and messaging services. We are not responsible for third-party failures or policies.
        </Section>
        <Section title="14. Suspension & Termination">
          We may suspend or terminate your account for violating these Terms, fraudulent activity, platform misuse, or legal requirements. You may stop using the platform at any time.
        </Section>
        <Section title="15. Disclaimer of Warranties">
          ReportAfrica is provided "as is" and "as available." We do not guarantee continuous availability, error-free operation, accuracy of user content, or absence of harmful content.
        </Section>
        <Section title="16. Limitation of Liability">
          TRADILINK AFRICA SOLUTION LIMITED shall not be liable for loss of data, loss of income/profits, damages from user content, platform interruptions, or actions of other users — to the maximum extent permitted by law.
        </Section>
        <Section title="17. Indemnification">
          You agree to indemnify TRADILINK AFRICA SOLUTION LIMITED from claims arising from your use of the platform, your content, violation of these Terms, or violation of any law or third-party rights.
        </Section>
        <Section title="18. Compliance">
          You agree to comply with all applicable laws in your country and any jurisdiction where you access ReportAfrica.
        </Section>
        <Section title="19. Governing Law">
          These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes shall be resolved in competent courts within Nigeria unless otherwise required by law.
        </Section>
        <Section title="20. Changes to Terms">
          We may update these Terms at any time. Continued use after changes constitutes acceptance.
        </Section>
        <Section title="21. Contact">
          {`TRADILINK AFRICA SOLUTION LIMITED\nOwner and Operator of ReportAfrica\n\nWebsite: reportafrica.africa\nEmail: legal@reportafrica.africa\nSupport: support@reportafrica.africa\nHead Office: Federal Republic of Nigeria`}
        </Section>
      </>
    ),
  },
  Contact: {
    title: 'Contact Us',
    content: () => (
      <>
        <Section title="Email">support@reportafrica.com</Section>
        <Section title="Office">Lagos, Nigeria</Section>
        <Section title="Social Media">
          Twitter/X: @reportafrica{'\n'}Instagram: @reportafrica{'\n'}LinkedIn: /company/reportafrica
        </Section>
        <Section title="Response Time">We typically respond within 24 hours on business days.</Section>
      </>
    ),
  },
  Careers: {
    title: 'Careers',
    content: () => (
      <>
        <Text style={styles.sectionBody}>Join us in building Africa's most trusted citizen reporting platform. We're remote-first and passionate about civic technology.</Text>
        {[
          'Senior Backend Engineer — Remote',
          'Mobile Engineer (React Native) — Remote',
          'AI/ML Engineer — Remote',
          'Product Designer — Remote',
          'Community Manager — Lagos',
          'Country Lead — Nairobi',
        ].map((role) => (
          <View key={role} style={styles.jobItem}>
            <Text style={styles.jobTitle}>{role}</Text>
          </View>
        ))}
        <Text style={[styles.sectionBody, { marginTop: 16 }]}>Send your CV to careers@reportafrica.com</Text>
      </>
    ),
  },
  Press: {
    title: 'Press & Media Kit',
    content: () => (
      <>
        <Section title="About">
          ReportAfrica is Africa's citizen-powered live reporting platform covering 32+ countries with AI-verified citizen journalism.
        </Section>
        <Section title="Key Facts">
          {`• 32+ African countries\n• 8 report categories\n• Founded 2024\n• HQ: Lagos, Nigeria\n• Platforms: Web, iOS, Android\n• 9+ languages`}
        </Section>
        <Section title="Press Contact">press@reportafrica.com</Section>
      </>
    ),
  },
  Partners: {
    title: 'Partners',
    content: () => (
      <>
        <Section title="Media Houses">
          License verified citizen content for your newsroom. Access real-time reports from across Africa.
        </Section>
        <Section title="Government Agencies">
          Real-time incident monitoring, emergency response coordination, and public safety analytics.
        </Section>
        <Section title="NGOs & Civil Society">
          Leverage citizen reports for humanitarian response, election monitoring, and human rights documentation.
        </Section>
        <Section title="Become a Partner">partners@reportafrica.com</Section>
      </>
    ),
  },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

export default function InfoScreen({ route }: any) {
  const page = PAGES[route.params?.page] || PAGES.About;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>{page.title}</Text>
      {page.content()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 6 },
  sectionBody: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'flex-start' },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0F7B6C', justifyContent: 'center', alignItems: 'center' },
  stepNumText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 2 },
  stepDesc: { fontSize: 13, color: '#6B7280' },
  faqItem: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  faqQ: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 4 },
  faqA: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
  jobItem: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  jobTitle: { fontSize: 14, fontWeight: '500', color: '#111' },
});
