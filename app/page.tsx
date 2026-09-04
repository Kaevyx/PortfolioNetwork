import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  Briefcase, 
  BarChart3, 
  Shield, 
  Zap,
  Globe,
  Heart,
  MessageSquare,
  Star,
  TrendingUp,
  Search,
  Bell,
  FileText,
  Link as LinkIcon,
  Sparkles,
  Rocket,
  Award,
  Target,
  AtSign,
  Inbox,
  Ticket,
  Hash,
  Bookmark,
  Send,
  Lock,
  AlertTriangle,
  Eye,
  Ban,
  MapPin,
  Wrench
} from "lucide-react";
import { HomepageStats } from "@/components/HomepageStats";
import { ReviewsCarousel } from "@/components/ReviewsCarousel";
import { AverageRating } from "@/components/AverageRating";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Professional Networking",
      description: "Connect with professionals in your industry, build meaningful relationships, and grow your network.",
      color: "indigo",
    },
    {
      icon: <Briefcase className="w-8 h-8" />,
      title: "Portfolio Showcase",
      description: "Display your best work, skills, education, and experience in a beautiful portfolio format.",
      color: "purple",
    },
    {
      icon: <Inbox className="w-8 h-8" />,
      title: "Direct Messaging",
      description: "Send private messages to other professionals with read receipts and real-time updates.",
      color: "blue",
    },
    {
      icon: <AtSign className="w-8 h-8" />,
      title: "Mentions & Tags",
      description: "Mention other users in posts and comments to engage directly with your network.",
      color: "pink",
    },
    {
      icon: <Ticket className="w-8 h-8" />,
      title: "Support System",
      description: "Get help when you need it with our integrated support ticket system for platform assistance.",
      color: "orange",
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Social Feed",
      description: "Share updates, engage with content, and stay connected with your professional network.",
      color: "cyan",
    },
    {
      icon: <Hash className="w-8 h-8" />,
      title: "Hashtags & Discovery",
      description: "Use hashtags to categorize your content and discover trending topics in your industry.",
      color: "teal",
    },
    {
      icon: <Bookmark className="w-8 h-8" />,
      title: "Save & Organize",
      description: "Bookmark posts and content you want to revisit later for easy access.",
      color: "amber",
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Rich Reactions",
      description: "Express yourself with multiple reaction types - like, love, laugh, and more.",
      color: "rose",
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: "Reviews & Ratings",
      description: "Build credibility with verified reviews and ratings from clients, colleagues, and employers.",
      color: "yellow",
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Advanced Analytics",
      description: "Track your profile performance, engagement metrics, and network growth with detailed insights.",
      color: "green",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Verified Accounts",
      description: "Get verified to build trust, stand out, and show your authenticity to potential clients.",
      color: "red",
    },
    {
      icon: <Search className="w-8 h-8" />,
      title: "Smart Discovery",
      description: "Find professionals, skills, and services with our powerful search and recommendation engine. Featured profiles appear first.",
      color: "violet",
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: "Featured Profiles",
      description: "Pro and Ultimate members get featured priority, appearing at the top of search results and explore pages for maximum visibility.",
      color: "amber",
    },
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Location-Based Discovery",
      description: "Find professionals near you with our location-based search. Connect with local professionals and discover networking opportunities in your area.",
      color: "blue",
    },
    {
      icon: <Wrench className="w-8 h-8" />,
      title: "Skills Matching",
      description: "Discover people with similar skills, get skill endorsements, and find collaborators. Track trending skills and build your professional expertise.",
      color: "indigo",
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: "Profile View Tracking",
      description: "See who's viewing your profile in real-time. Track your profile visibility and understand your network reach.",
      color: "purple",
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: "Smart Notifications",
      description: "Stay connected with customizable notifications and real-time activity feeds.",
      color: "indigo",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Trending Content",
      description: "Discover what's trending in your network and industry with our trending feed.",
      color: "emerald",
    },
    {
      icon: <LinkIcon className="w-8 h-8" />,
      title: "Custom Profile URLs",
      description: "Pro and Ultimate users can customize their profile URL (e.g., /profile/yourname) for a professional, memorable link.",
      color: "indigo",
    },
  ];

  const benefits = [
    {
      title: "For Professional Individuals",
      description: "Everything you need to build your professional presence, connect with peers, and advance your career.",
      features: [
        "Complete professional profile with portfolio",
        "Get verified reviews from colleagues and clients",
        "Track your analytics and engagement metrics",
        "Connect and network with industry professionals",
        "Share updates and engage with your network",
        "Direct messaging with read receipts",
        "Support system for platform assistance",
        "Advanced search and discovery tools",
        "Featured profiles (Pro & Ultimate) appear first in search",
        "Location-based discovery to find professionals near you",
        "Skills matching and endorsements to showcase expertise",
        "Real-time profile view tracking to understand your reach",
      ],
      icon: <Users className="w-6 h-6" />,
    },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Freelance Designer",
      content: "Portfolio Network helped me showcase my work and connect with amazing clients. The analytics are incredibly detailed!",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Software Developer",
      content: "Best professional networking platform I've used. The verification system adds real credibility.",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "Marketing Consultant",
      content: "Love how easy it is to build connections and share updates. The feed keeps me engaged with my network.",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20"></div>
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="text-center max-w-5xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Professional Networking Platform
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
              Build Your Professional Presence
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-4 max-w-3xl mx-auto">
              Showcase your skills, connect with professionals, and grow your network.
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              The professional networking platform designed for individuals to build their online presence, connect with peers, and advance their careers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/sign-up"
                className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/docs"
                className="px-8 py-4 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-xl font-semibold border-2 border-indigo-600 dark:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                View Documentation
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Free to Join</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Verified Profiles</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Secure & Private</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              Built for Professionals
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Everything you need to build your professional presence, grow your network, and advance your career.
            </p>
          </div>
          <div className="grid md:grid-cols-1 gap-8 max-w-3xl mx-auto">
            {benefits.map((benefit, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 card-hover"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                    {benefit.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {benefit.title}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {benefit.description}
                </p>
                <ul className="space-y-3">
                  {benefit.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Everything you need to build and grow your professional presence online.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const colorClasses: Record<string, string> = {
                indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
                purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
                yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
                green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
                blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                red: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                pink: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
                orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
                cyan: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
                teal: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
                amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                rose: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
                violet: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
                emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
              };
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 card-hover group"
                >
                  <div className={`w-14 h-14 ${colorClasses[feature.color]} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Safety & Moderation Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-pink-50/30 dark:from-gray-800/50 dark:via-gray-800/50 dark:to-gray-800/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold mb-6">
              <Shield className="w-4 h-4" />
              Safe & Secure Platform
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              Your Safety is Our Priority
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              We use advanced content moderation and safety systems to ensure a professional and respectful environment for everyone.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 card-hover">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center mb-4">
                <Ban className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Automatic Content Filtering
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Advanced keyword and domain filtering automatically prevents inappropriate content from being posted, keeping the platform safe for everyone.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 card-hover">
              <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Community Reporting
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Report inappropriate content, harassment, or violations. Our moderation team reviews all reports and takes appropriate action.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 card-hover">
              <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl flex items-center justify-center mb-4">
                <Eye className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Active Moderation
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Dedicated moderation team monitors the platform 24/7, reviewing reports and ensuring community guidelines are followed.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 card-hover">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Warning System
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Users receive clear warnings for guideline violations, helping maintain a professional environment while giving opportunities to improve.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 card-hover">
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Privacy & Security
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Your data is protected with industry-standard security measures. Control your privacy settings and who can see your content.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 card-hover">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Verified Accounts
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Verified accounts add an extra layer of trust. Get verified to show your authenticity and build credibility with your network.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 md:p-12 text-center">
            <Shield className="w-16 h-16 text-indigo-600 dark:text-indigo-400 mx-auto mb-6" />
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              A Safe Space for Professionals
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              We're committed to maintaining a respectful, professional environment. Our comprehensive moderation system protects users from harassment, spam, and inappropriate content while preserving freedom of expression.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Real-time content filtering</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>24/7 moderation team</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Community reporting system</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Transparent warning system</span>
              </div>
            </div>
            <div className="mt-8">
              <Link
                href="/terms#community-guidelines"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                <FileText className="w-5 h-5" />
                Read Community Guidelines
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <HomepageStats />
        </div>
      </section>

      {/* Reviews Carousel */}
      <section className="py-20 bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              Loved by Professionals
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-4">
              See what our users are saying about Portfolio Network.
            </p>
            {/* Average Rating - Smaller version for homepage */}
            <div className="flex justify-center">
              <AverageRating size="medium" showCount={true} />
            </div>
          </div>
          <div className="max-w-4xl mx-auto">
            <ReviewsCarousel autoRotate={true} rotateInterval={6000} limit={10} />
          </div>
          <div className="text-center mt-8">
            <Link
              href="/reviews"
              className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold"
            >
              View All Reviews
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
                Join thousands of professionals building their online presence and growing their network.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/sign-up"
                  className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                  Create Free Account
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/pricing"
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-semibold hover:bg-white/20 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
