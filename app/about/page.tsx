import { Users, Target, Award, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">About Us</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Building the future of professional networking and portfolio showcasing
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12 mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Our Mission</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            Portfolio Network was founded with a simple yet powerful vision: to create a platform where
            professionals can showcase their work, connect with like-minded individuals, and build meaningful
            professional relationships. We believe that everyone deserves a space to highlight their achievements
            and connect with opportunities.
          </p>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Whether you're a freelancer looking for clients, a business seeking partnerships, or a professional
            building your network, Portfolio Network provides the tools and community you need to succeed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <Users className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Our Community</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Join thousands of professionals from around the world who are building their professional presence
              and connecting with opportunities.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <Target className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Our Goals</h3>
            <p className="text-gray-600 dark:text-gray-400">
              To empower professionals with the tools they need to showcase their work, build their network,
              and achieve their career goals.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <Award className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Our Values</h3>
            <p className="text-gray-600 dark:text-gray-400">
              We value transparency, authenticity, and professional growth. Our platform is built on trust
              and respect for all members.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <Heart className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mb-4" />
            <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Our Commitment</h3>
            <p className="text-gray-600 dark:text-gray-400">
              We're committed to continuously improving our platform and providing the best experience for
              our community of professionals.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
          <p className="text-indigo-100 mb-6 max-w-2xl mx-auto">
            Start building your professional presence today and connect with opportunities that matter to you.
          </p>
          <a
            href="/sign-up"
            className="inline-block px-8 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}






