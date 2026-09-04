import Link from "next/link";
import { Calendar, User, ArrowRight } from "lucide-react";

export default function BlogPage() {
  const blogPosts = [
    {
      id: 1,
      title: "10 Tips for Building a Professional Portfolio",
      excerpt: "Learn how to create a portfolio that stands out and attracts the right opportunities.",
      author: "Sarah Johnson",
      date: "2024-01-15",
      category: "Career",
    },
    {
      id: 2,
      title: "The Future of Professional Networking",
      excerpt: "Discover how online networking is evolving and what it means for your career.",
      author: "Michael Chen",
      date: "2024-01-10",
      category: "Networking",
    },
    {
      id: 3,
      title: "How to Get Verified on Portfolio Network",
      excerpt: "A step-by-step guide to getting your verified badge and building trust.",
      author: "Emily Davis",
      date: "2024-01-05",
      category: "Platform",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">Blog</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Insights, tips, and stories from the professional world
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <article
              key={post.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden card-hover"
            >
              <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600"></div>
              <div className="p-6">
                <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-semibold mb-3">
                  {post.category}
                </span>
                <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
                  {post.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <Link
                  href={`/blog/${post.id}`}
                  className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold"
                >
                  Read More
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            More articles coming soon!
          </p>
        </div>
      </div>
    </div>
  );
}






