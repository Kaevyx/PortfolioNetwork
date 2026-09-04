import { 
  User, 
  Briefcase, 
  Star, 
  Users, 
  BarChart3, 
  Search, 
  Bell, 
  Shield,
  Zap,
  Globe,
  Heart,
  MessageSquare,
  Inbox,
  AtSign,
  Ticket,
  Hash,
  Bookmark,
  TrendingUp,
  LinkIcon
} from "lucide-react";
import Link from "next/link";

export default function FeaturesPage() {
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
      description: "Find professionals, skills, and services with our powerful search and recommendation engine.",
      color: "violet",
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

  const colorClasses: Record<string, string> = {
    indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    pink: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    red: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    teal: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
    cyan: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
    violet: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
    emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">Features</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Everything you need to build your professional presence and grow your network
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 card-hover"
            >
              <div className={`w-16 h-16 ${colorClasses[feature.color]} rounded-xl flex items-center justify-center mb-4`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-indigo-100 mb-6 max-w-2xl mx-auto">
            Join thousands of professionals who are already using Portfolio Network to grow their careers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-block px-8 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Create Your Profile
            </Link>
            <Link
              href="/safety"
              className="inline-block px-8 py-3 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-semibold hover:bg-white/20 transition-colors shadow-lg"
            >
              Learn About Safety
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}






