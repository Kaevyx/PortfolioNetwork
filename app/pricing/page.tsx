"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Check, Crown, Sparkles, Zap, Info } from "lucide-react";

export default function PricingPage() {
  const { user, isLoaded } = useUser();
  const [currentPlan, setCurrentPlan] = useState("free");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const supabase = createClient();

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const loadPlan = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_plan, is_premium")
        .eq("clerk_id", user.id)
        .single();
      
      setCurrentPlan(profile?.subscription_plan || "free");
    };

    loadPlan();
  }, [isLoaded, user?.id, supabase]);

  const plans = [
    {
      name: "free",
      displayName: "Free",
      priceMonthly: 0,
      priceAnnual: 0,
      description: "Perfect for getting started",
      icon: Zap,
      features: [
        "Basic Professional Profile",
        "Up to 100 Connections",
        "50 Posts Per Month",
        "Basic Analytics",
        "Community Support",
        "Profile Picture Uploads",
        "Direct Messaging",
        "Basic Reactions (Like Only)",
        "Hashtags & Mentions",
        "Save/Bookmark Posts",
        "50 MB Storage",
      ],
      limitations: [
        "No File Uploads (CVs, Documents)",
        "No Post Scheduling",
        "No Data Export",
        "Limited to Basic Analytics",
      ],
      popular: false,
    },
    {
      name: "pro",
      displayName: "Pro",
      priceMonthly: 7.99,
      priceAnnual: 79.99,
      description: "For professionals who want more",
      icon: Sparkles,
      features: [
        "Everything in Free",
        "Unlimited Connections",
        "Unlimited Posts",
        "Advanced Analytics & Insights",
        "Priority Support",
        "Premium Badge on Profile",
        "Featured Profile (Appears First in Search)",
        "Location-Based Discovery (Users Near You)",
        "Skills Matching & Endorsements",
        "Profile View Tracking",
        "Custom Profile URL (e.g., /profile/yourname)",
        "File Uploads (CVs, Documents, Portfolio)",
        "500 MB Secure Storage",
        "Post Scheduling",
        "Data Export (Coming Soon)",
        "Rich Reactions (All Types)",
        "Enhanced Profile Customization",
        "Early Access to New Features",
      ],
      limitations: [],
      popular: true,
    },
    {
      name: "ultimate",
      displayName: "Ultimate",
      priceMonthly: 24.99,
      priceAnnual: 249.99,
      description: "For power users and professionals",
      icon: Crown,
      features: [
        "Everything in Pro",
        "Highest Featured Priority (Top of Search Results)",
        "Custom Profile URL (e.g., /profile/yourname)",
        "Enhanced Location & Skills Features",
        "5 GB Secure Storage",
        "API Access (Coming Soon)",
        "Dedicated Support Manager",
        "Advanced Security Features",
        "White-Label Options (Coming Soon)",
        "Custom Integrations (Coming Soon)",
        "Bulk Operations (Coming Soon)",
        "Custom Domain Support (Coming Soon)",
        "Custom Branding (Coming Soon)",
      ],
      limitations: [],
      popular: false,
    },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price);
  };

  // Feature tooltips descriptions
  const featureTooltips: Record<string, string> = {
    "Basic Professional Profile": "Create a complete professional profile with your bio, skills, experience, and portfolio to showcase your expertise.",
    "Up to 100 Connections": "Connect with up to 100 professionals in your network. Build meaningful relationships and expand your professional circle.",
    "50 Posts Per Month": "Share up to 50 posts per month to keep your network engaged with updates, insights, and professional content.",
    "Basic Analytics": "View essential analytics including profile views, post engagement, and connection growth to track your professional presence.",
    "Community Support": "Get help from our community support team and access to help documentation and FAQs.",
    "Profile Picture Uploads": "Upload and customize your profile picture to make a great first impression on your professional profile.",
    "Direct Messaging": "Send and receive direct messages with your connections. Build relationships through private conversations.",
    "Basic Reactions (Like Only)": "Show appreciation for posts with likes. Engage with content from your network.",
    "Hashtags & Mentions": "Use hashtags to categorize your content and mention other users to tag them in your posts and comments.",
    "Save/Bookmark Posts": "Save interesting posts for later reference. Build a collection of valuable content from your network.",
    "50 MB Storage": "Store up to 50 MB of files including profile pictures and basic uploads.",
    "Unlimited Connections": "Connect with unlimited professionals. Build an extensive network without restrictions.",
    "Unlimited Posts": "Share as many posts as you want. Keep your network engaged with unlimited content sharing.",
    "Advanced Analytics & Insights": "Get detailed analytics including engagement rates, audience insights, best posting times, and comprehensive performance metrics.",
    "Priority Support": "Receive priority support with faster response times. Get help when you need it most.",
    "Premium Badge on Profile": "Display a premium badge on your profile to show your Pro status and stand out from the crowd.",
    "Featured Profile (Appears First in Search)": "Your profile appears at the top of search results, increasing your visibility and helping others discover you first.",
    "Location-Based Discovery (Users Near You)": "Discover professionals near your location. Find networking opportunities in your area and connect with local professionals.",
    "Skills Matching & Endorsements": "Get matched with professionals who share similar skills. Receive skill endorsements from your network to showcase your expertise.",
    "Profile View Tracking": "See who's viewing your profile in real-time. Track your profile visibility and understand your network reach.",
    "File Uploads (CVs, Documents, Portfolio)": "Upload CVs, documents, portfolio items, and other professional files to showcase your work and credentials.",
    "500 MB Secure Storage": "Store up to 500 MB of files securely. Upload CVs, portfolios, certificates, and other professional documents.",
    "Post Scheduling": "Schedule your posts in advance. Plan your content strategy and maintain consistent engagement with your network.",
    "Data Export (Coming Soon)": "Export your profile data, connections, and analytics in various formats for backup or analysis purposes.",
    "Rich Reactions (All Types)": "Express yourself with a full range of reactions including like, love, celebrate, support, and more.",
    "Enhanced Profile Customization": "Customize your profile with advanced options including custom sections, themes, and layout preferences.",
    "Early Access to New Features": "Be among the first to try new features and updates. Help shape the platform with early feedback.",
    "Highest Featured Priority (Top of Search Results)": "Get the highest priority in search results. Your profile appears at the very top, maximizing your visibility and discoverability.",
    "Enhanced Location & Skills Features": "Access advanced location-based features and enhanced skills matching algorithms for better networking opportunities.",
    "5 GB Secure Storage": "Store up to 5 GB of files securely. Perfect for extensive portfolios, large documents, and comprehensive professional materials.",
    "API Access (Coming Soon)": "Access our API to integrate with your own tools and applications. Build custom integrations and automate workflows.",
    "Dedicated Support Manager": "Get a dedicated support manager who understands your needs and provides personalized assistance whenever required.",
    "Advanced Security Features": "Access advanced security features including two-factor authentication, login alerts, and enhanced privacy controls.",
    "White-Label Options (Coming Soon)": "Customize the platform with your own branding. Remove our branding and add your own for a personalized experience.",
    "Custom Integrations (Coming Soon)": "Build custom integrations with your favorite tools and services. Connect your professional ecosystem seamlessly.",
    "Bulk Operations (Coming Soon)": "Perform bulk operations on your content, connections, and data. Save time with powerful batch processing tools.",
    "Custom Domain Support (Coming Soon)": "Use your own custom domain for your profile. Create a professional web presence with your own domain name.",
    "Custom Branding (Coming Soon)": "Customize the platform's appearance with your own branding, colors, and styling for a fully personalized experience.",
  };

  const handleStartTrial = async (planName: string) => {
    if (!user?.id) {
      window.location.href = "/sign-up";
      return;
    }

    try {
      const response = await fetch("/api/billing/start-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to start trial");
        return;
      }

      alert(`7-day ${planName} trial started!`);
      window.location.reload();
    } catch (error) {
      console.error("Error starting trial:", error);
      alert("Failed to start trial");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold gradient-text mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Select the perfect plan for your professional networking needs
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={`text-sm font-medium transition-colors ${billingCycle === "monthly" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
            className={`relative inline-flex h-9 w-16 items-center rounded-full transition-all duration-200 ${
              billingCycle === "yearly" ? "bg-indigo-600 shadow-lg" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                billingCycle === "yearly" ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium transition-colors ${billingCycle === "yearly" ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
              Yearly
            </span>
            {billingCycle === "yearly" && (
              <span className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2.5 py-1 rounded-full font-semibold shadow-sm">
                Save up to 17%
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 overflow-visible">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.name;
            const isPopular = plan.popular;
            const price = billingCycle === "monthly" ? plan.priceMonthly : plan.priceAnnual;
            const monthlyEquivalent = billingCycle === "yearly" ? plan.priceAnnual / 12 : plan.priceMonthly;
            const savings = billingCycle === "yearly" && plan.priceMonthly > 0 
              ? Math.round((1 - plan.priceAnnual / (plan.priceMonthly * 12)) * 100) 
              : 0;

            return (
              <div
                key={plan.name}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border-2 transition-all overflow-visible ${
                  isPopular
                    ? "border-indigo-500 scale-105 z-10"
                    : "border-gray-200 dark:border-gray-700"
                } ${isCurrentPlan ? "ring-4 ring-indigo-300 dark:ring-indigo-700" : ""}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                    plan.name === "free" 
                      ? "bg-gray-100 dark:bg-gray-700" 
                      : plan.name === "pro"
                      ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                      : "bg-gradient-to-br from-purple-500 to-pink-600"
                  }`}>
                    <Icon className={`w-8 h-8 ${
                      plan.name === "free" 
                        ? "text-gray-600 dark:text-gray-300"
                        : "text-white"
                    }`} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.displayName}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {plan.description}
                  </p>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {formatPrice(price)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      /{billingCycle === "monthly" ? "month" : "year"}
                    </span>
                  </div>
                  {billingCycle === "yearly" && plan.priceMonthly > 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {formatPrice(monthlyEquivalent)}/month billed yearly
                    </p>
                  )}
                  {billingCycle === "yearly" && savings > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400 font-semibold">
                      Save {savings}% vs monthly
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-4">
                  {plan.features.map((feature, idx) => {
                    const isComingSoon = feature.includes("(Coming Soon)");
                    const featureText = isComingSoon ? feature.replace(" (Coming Soon)", "") : feature;
                    const tooltip = featureTooltips[featureText];
                    
                    // Split feature text if it contains brackets
                    const bracketMatch = featureText.match(/^(.+?)\s*\((.+?)\)$/);
                    const mainText = bracketMatch ? bracketMatch[1] : featureText;
                    const bracketText = bracketMatch ? bracketMatch[2] : null;
                    
                    return (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isComingSoon ? "text-gray-400 dark:text-gray-500" : "text-green-500"}`} />
                        <div className="flex-1 flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`${isComingSoon ? "text-gray-500 dark:text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
                              {mainText}
                            </span>
                            {isComingSoon && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                Coming Soon
                              </span>
                            )}
                            {tooltip && (
                              <div className="relative inline-block group/tooltip">
                                <Info className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" />
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 pointer-events-none z-[100] whitespace-normal">
                                  {tooltip}
                                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                                </div>
                              </div>
                            )}
                          </div>
                          {bracketText && (
                            <span className={`text-sm ${isComingSoon ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-400"}`}>
                              ({bracketText})
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                
                {plan.limitations && plan.limitations.length > 0 && (
                  <div className="mb-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                      Limitations
                    </p>
                    <ul className="space-y-2">
                      {plan.limitations.map((limitation, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-gray-400 dark:text-gray-500 text-sm">•</span>
                          <span className="text-gray-500 dark:text-gray-400 text-sm">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-6 py-3 rounded-xl font-semibold cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : plan.priceMonthly === 0 ? (
                  <Link
                    href={user?.id ? "/dashboard" : "/sign-up"}
                    className="block w-full text-center px-6 py-3 rounded-xl font-semibold transition-all bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Get Started
                  </Link>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleStartTrial(plan.name)}
                      className={`w-full text-center px-6 py-2 rounded-xl font-semibold transition-all border-2 ${
                        isPopular
                          ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          : "border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                      }`}
                    >
                      Start 7-Day Trial
                    </button>
                    <Link
                      href={user?.id ? `/checkout?plan=${plan.name}&billing=${billingCycle}` : "/sign-up"}
                      className={`block w-full text-center px-6 py-2 rounded-xl font-semibold transition-all ${
                        isPopular
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      Subscribe Now
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            All plans include
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <Check className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Secure Platform</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enterprise-grade security and privacy
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <Check className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">24/7 Support</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We're here to help whenever you need us
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <Check className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Regular Updates</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                New features and improvements regularly
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
