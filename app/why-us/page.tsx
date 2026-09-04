import Link from "next/link";
import {
  CheckCircle2,
  Users,
  Briefcase,
  BarChart3,
  Shield,
  Zap,
  Star,
  TrendingUp,
  Search,
  Bell,
  Heart,
  MessageSquare,
  Inbox,
  AtSign,
  Ticket,
  Hash,
  Bookmark,
  Award,
  Target,
  Rocket,
  Sparkles,
  Crown,
  ArrowRight,
  Globe,
  Lock,
  Eye,
  FileText,
  Check,
  X
} from "lucide-react";

export default function WhyUsPage() {
  const differentiators = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Safe & Secure Platform",
      description: "Advanced content moderation, 24/7 monitoring, and comprehensive safety systems ensure a professional environment free from harassment and spam.",
      color: "green",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Professional-Focused",
      description: "Built specifically for individual professionals, not businesses. Connect with peers, showcase your work, and advance your career in a focused environment.",
      color: "indigo",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Feature-Rich Platform",
      description: "Direct messaging, mentions, hashtags, support tickets, rich reactions, and more - everything you need in one professional networking platform.",
      color: "yellow",
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Advanced Analytics",
      description: "Track your profile performance, engagement metrics, and network growth with detailed insights to help you grow your professional presence.",
      color: "purple",
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Verified Accounts",
      description: "Build trust and credibility with verified accounts. Stand out from the crowd and show your authenticity to potential clients and employers.",
      color: "amber",
    },
    {
      icon: <Rocket className="w-8 h-8" />,
      title: "Growing Community",
      description: "Join a rapidly growing community of professionals who are building their online presence, connecting with peers, and advancing their careers.",
      color: "rose",
    },
  ];

  const whyCreateProfile = [
    {
      icon: <Briefcase className="w-8 h-8" />,
      title: "Showcase Your Work",
      description: "Create a professional portfolio that highlights your skills, experience, education, and achievements. Display your best work with images, descriptions, and project links.",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Build Your Network",
      description: "Connect with professionals in your industry, follow thought leaders, and grow your professional network. Build meaningful relationships that advance your career.",
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: "Earn Reviews & Ratings",
      description: "Build credibility with verified reviews and ratings from clients, colleagues, and employers. Showcase your reputation and stand out to potential opportunities.",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Grow Your Career",
      description: "Discover job opportunities, connect with recruiters, and showcase your expertise. Use analytics to track your growth and optimize your professional presence.",
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Engage with Your Network",
      description: "Share updates, engage with content, and stay connected. Use mentions, hashtags, and direct messaging to build relationships and stay top-of-mind.",
    },
    {
      icon: <Search className="w-8 h-8" />,
      title: "Get Discovered",
      description: "Be found by potential clients, employers, and collaborators. Our powerful search and discovery features help you reach the right people.",
    },
  ];

  const whyJoinPlatform = [
    {
      title: "All-in-One Solution",
      description: "No need for multiple platforms. Portfolio Network combines portfolio hosting, professional networking, social engagement, and career tools in one place.",
      icon: <Target className="w-6 h-6" />,
    },
    {
      title: "Free to Start",
      description: "Create your profile and start networking completely free. Upgrade when you're ready for advanced features and unlimited access.",
      icon: <Zap className="w-6 h-6" />,
    },
    {
      title: "Privacy & Control",
      description: "Control who sees your content with granular privacy settings. Your data is protected with industry-standard security measures.",
      icon: <Lock className="w-6 h-6" />,
    },
    {
      title: "Active Community",
      description: "Join a vibrant community of professionals sharing insights, opportunities, and supporting each other's growth.",
      icon: <Users className="w-6 h-6" />,
    },
    {
      title: "Regular Updates",
      description: "We're constantly improving the platform with new features, better performance, and enhanced security based on user feedback.",
      icon: <Rocket className="w-6 h-6" />,
    },
    {
      title: "Dedicated Support",
      description: "Get help when you need it with our integrated support ticket system. Priority support available for Pro and Ultimate plans.",
      icon: <Ticket className="w-6 h-6" />,
    },
  ];

  const plans = [
    {
      name: "Free",
      price: "£0",
      period: "forever",
      description: "Perfect for getting started with professional networking",
      icon: <Zap className="w-6 h-6" />,
      features: [
        "Basic professional profile",
        "Up to 100 connections",
        "50 posts per month",
        "Basic analytics",
        "Community support",
        "Profile picture uploads",
        "Direct messaging",
        "Basic reactions (like only)",
        "Hashtags & mentions",
        "Save/bookmark posts",
        "50 MB storage",
      ],
      limitations: [
        "No file uploads (CVs, documents)",
        "No post scheduling",
        "No data export",
        "Limited to basic analytics",
      ],
      cta: "Get Started Free",
      popular: false,
    },
    {
      name: "Pro",
      price: "£7.99",
      period: "per month",
      description: "For professionals who want to maximize their presence",
      icon: <Sparkles className="w-6 h-6" />,
      features: [
        "Everything in Free",
        "Unlimited connections",
        "Unlimited posts",
        "Advanced analytics & insights",
        "Priority support",
        "Premium badge on profile",
        "File uploads (CVs, documents)",
        "500 MB secure storage",
        "Post scheduling",
        "Data export",
        "Enhanced profile customization",
        "Early access to new features",
      ],
      limitations: [],
      cta: "Upgrade to Pro",
      popular: true,
      savings: "Save 17% with annual billing (£79.99/year)",
    },
    {
      name: "Ultimate",
      price: "£24.99",
      period: "per month",
      description: "For power users and professionals",
      icon: <Crown className="w-6 h-6" />,
      features: [
        "Everything in Pro",
        "5 GB secure storage",
        "API access",
        "Dedicated support manager",
        "Advanced security features",
        "White-label options",
        "Custom integrations",
        "Bulk operations",
        "Custom domain support",
        "Custom branding",
      ],
      limitations: [],
      cta: "Contact Sales",
      popular: false,
      savings: "Save 17% with annual billing (£249.99/year)",
    },
  ];

  const colorClasses: Record<string, string> = {
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
    yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20"></div>
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
              Why Choose Portfolio Network?
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-4 max-w-3xl mx-auto">
              The professional networking platform designed for individuals who want to build their online presence, connect with peers, and advance their careers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link
                href="/sign-up"
                className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                Create Your Profile
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/features"
                className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-lg"
              >
                Explore Features
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              What Makes Us Different
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              We're not just another social network. We're a professional platform built specifically for individual professionals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {differentiators.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 card-hover"
              >
                <div className={`w-16 h-16 ${colorClasses[item.color]} rounded-xl flex items-center justify-center mb-4`}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Create a Profile */}
      <section className="py-20 bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              Why Create a Profile?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Your professional profile is your digital business card. Here's why you should create one today.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyCreateProfile.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 card-hover"
              >
                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Be on Our Platform */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              Why Be on Our Platform?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Join thousands of professionals who are already building their careers on Portfolio Network.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyJoinPlatform.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Paid Plans Benefits */}
      <section className="py-20 bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-pink-50/30 dark:from-gray-800/50 dark:via-gray-800/50 dark:to-gray-800/50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Start free and upgrade when you're ready for advanced features and unlimited access.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 ${
                  plan.popular
                    ? "border-indigo-500 dark:border-indigo-500 scale-105"
                    : "border-gray-200 dark:border-gray-700"
                } p-8 relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {plan.price}
                    </span>
                    {plan.period !== "forever" && (
                      <span className="text-gray-600 dark:text-gray-400">
                        /{plan.period}
                      </span>
                    )}
                  </div>
                  {plan.savings && (
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-2">
                      {plan.savings}
                    </p>
                  )}
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {plan.description}
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      Included Features
                    </h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.limitations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <X className="w-5 h-5 text-red-500" />
                        Limitations
                      </h4>
                      <ul className="space-y-2">
                        {plan.limitations.map((limitation, lIdx) => (
                          <li key={lIdx} className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <span>{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <Link
                  href={plan.name === "Business" ? "/contact" : "/sign-up"}
                  className={`block w-full text-center py-3 px-6 rounded-xl font-semibold transition-all ${
                    plan.popular
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              All plans include our core features: professional profiles, networking, messaging, and community support.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              View Detailed Pricing
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-12 md:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <Rocket className="w-16 h-16 mx-auto mb-6 text-white/90" />
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
                Join thousands of professionals who are already building their careers on Portfolio Network. Create your profile today - it's free!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/sign-up"
                  className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                  Create Your Profile
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/features"
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-semibold hover:bg-white/20 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                  Explore Features
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

