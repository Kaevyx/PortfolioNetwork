import Link from "next/link";
import {
  Shield,
  Ban,
  AlertTriangle,
  Eye,
  Lock,
  CheckCircle2,
  FileText,
  Users,
  MessageSquare,
  Flag,
  Gavel,
  Bell,
  Search,
  Settings,
  ArrowRight,
  Info
} from "lucide-react";

export default function SafetyPage() {
  const safetyFeatures = [
    {
      icon: <Ban className="w-8 h-8" />,
      title: "Automatic Content Filtering",
      description: "Our advanced system automatically scans all posts, comments, and messages for inappropriate content, blocked keywords, and malicious domains before they're published.",
      details: [
        "Real-time keyword detection and blocking",
        "Domain blacklist protection",
        "Multiple severity levels (low, medium, high)",
        "Custom warning messages for different violation types",
        "Automatic content blocking with user feedback"
      ],
      color: "red",
    },
    {
      icon: <Flag className="w-8 h-8" />,
      title: "Community Reporting System",
      description: "Users can report inappropriate content, harassment, spam, or violations. Every report is reviewed by our moderation team.",
      details: [
        "Report posts, comments, profiles, and files",
        "Multiple report categories (spam, harassment, hate speech, etc.)",
        "Anonymous reporting option",
        "Quick response from moderation team",
        "Transparent resolution process"
      ],
      color: "orange",
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: "24/7 Active Moderation",
      description: "Our dedicated moderation team monitors the platform around the clock, reviewing reports and ensuring community guidelines are followed.",
      details: [
        "Round-the-clock monitoring",
        "Expert moderation team",
        "Comprehensive review process",
        "Fair and consistent enforcement",
        "Regular platform audits"
      ],
      color: "yellow",
    },
    {
      icon: <AlertTriangle className="w-8 h-8" />,
      title: "Warning System",
      description: "Users receive clear, actionable warnings for guideline violations. Warnings help maintain standards while giving users opportunities to improve.",
      details: [
        "Clear warning messages",
        "Severity-based warnings (low, medium, high)",
        "Warning acknowledgment system",
        "Links to reported content for context",
        "Progressive enforcement measures"
      ],
      color: "amber",
    },
    {
      icon: <Gavel className="w-8 h-8" />,
      title: "Account Actions",
      description: "For serious or repeated violations, our moderation team can take appropriate actions including account suspension or content removal.",
      details: [
        "Temporary or permanent account suspension",
        "Content removal for violations",
        "Transparent action notifications",
        "Appeal process for suspensions",
        "Account history tracking"
      ],
      color: "red",
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: "Privacy & Security",
      description: "Your data and privacy are protected with industry-standard security measures and granular privacy controls.",
      details: [
        "End-to-end encryption for sensitive data",
        "Granular privacy settings",
        "Control who can see your content",
        "Secure authentication system",
        "Regular security audits"
      ],
      color: "purple",
    },
  ];

  const moderationCategories = [
    {
      category: "Content Moderation",
      items: [
        "Blocked keywords and phrases",
        "Domain blacklist protection",
        "Spam detection and prevention",
        "Inappropriate content filtering",
        "Harassment prevention"
      ]
    },
    {
      category: "Community Protection",
      items: [
        "User reporting system",
        "Harassment prevention",
        "Hate speech detection",
        "Bullying prevention",
        "Doxxing protection"
      ]
    },
    {
      category: "Account Safety",
      items: [
        "Verified account system",
        "Account suspension for violations",
        "Warning system with acknowledgment",
        "Account history tracking",
        "Appeal process"
      ]
    },
    {
      category: "Privacy Controls",
      items: [
        "Profile visibility settings",
        "Content privacy controls",
        "Search visibility options",
        "Message privacy settings",
        "Data protection measures"
      ]
    }
  ];

  const colorClasses: Record<string, string> = {
    red: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20"></div>
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold mb-6">
              <Shield className="w-4 h-4" />
              Community Safety
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
              Your Safety is Our Priority
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-4 max-w-3xl mx-auto">
              We're committed to maintaining a safe, respectful, and professional environment for all users.
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              Our comprehensive moderation system protects users from harassment, spam, and inappropriate content while preserving freedom of expression.
            </p>
          </div>
        </div>
      </section>

      {/* Safety Features */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              How We Keep You Safe
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Multiple layers of protection work together to ensure a professional and respectful environment.
            </p>
          </div>

          <div className="space-y-8">
            {safetyFeatures.map((feature, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 md:p-10 card-hover"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    <div className={`w-20 h-20 ${colorClasses[feature.color]} rounded-xl flex items-center justify-center`}>
                      {feature.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                      {feature.description}
                    </p>
                    <ul className="space-y-2">
                      {feature.details.map((detail, dIdx) => (
                        <li key={dIdx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Moderation Categories */}
      <section className="py-20 bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              Comprehensive Protection
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Our safety systems cover all aspects of platform interaction.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {moderationCategories.map((category, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                  {category.category}
                </h3>
                <ul className="space-y-2">
                  {category.items.map((item, iIdx) => (
                    <li key={iIdx} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Reporting Works */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 md:p-12">
            <div className="text-center mb-12">
              <Flag className="w-16 h-16 text-indigo-600 dark:text-indigo-400 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                How Reporting Works
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Reporting inappropriate content is simple, anonymous, and effective.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                    Report Content
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Click the report button on any post, comment, profile, or file. Select the reason for reporting and add any additional context.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                    Moderation Review
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Our moderation team reviews your report, investigates the content, and determines the appropriate action.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                    Action Taken
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    If action is taken, you'll receive a notification. Actions may include content removal, warnings, or account suspension depending on severity.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                    Resolution
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    The report is resolved and you're notified of the outcome. Thank you for helping keep our community safe!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Guidelines Link */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl shadow-2xl p-12 md:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <Shield className="w-16 h-16 mx-auto mb-6 text-white/90" />
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Read Our Community Guidelines
              </h2>
              <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
                Learn more about our community standards, what's allowed, and how we maintain a professional environment.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/terms#community-guidelines"
                  className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  View Guidelines
                </Link>
                <Link
                  href="/support"
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-semibold hover:bg-white/20 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Your Trust Matters
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              We're transparent about our moderation practices and committed to fair enforcement.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
              <Info className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Transparent Process
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All moderation actions are logged and users are notified of any actions taken on their account.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
              <Gavel className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Fair Enforcement
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Our moderation team follows consistent guidelines and considers context when reviewing reports.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
              <Bell className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Quick Response
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Reports are typically reviewed within 24 hours, with urgent cases addressed even faster.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

