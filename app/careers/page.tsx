import { Briefcase, MapPin, Clock, ExternalLink } from "lucide-react";

export default function CareersPage() {
  const openPositions = [
    {
      id: 1,
      title: "Senior Full Stack Developer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: "Join our engineering team to build the future of professional networking.",
    },
    {
      id: 2,
      title: "Product Designer",
      department: "Design",
      location: "San Francisco, CA",
      type: "Full-time",
      description: "Help shape the user experience of our platform with your creative vision.",
    },
    {
      id: 3,
      title: "Marketing Manager",
      department: "Marketing",
      location: "Remote",
      type: "Full-time",
      description: "Drive growth and engagement through innovative marketing strategies.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">Careers</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Join us in building the future of professional networking
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12 mb-12">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Why Work With Us?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Innovation</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Work on cutting-edge technology and help shape the future of professional networking.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Growth</h3>
              <p className="text-gray-600 dark:text-gray-400">
                We invest in our team's professional development and career growth.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Culture</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Join a diverse, inclusive team that values collaboration and creativity.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Open Positions</h2>
          <div className="space-y-4">
            {openPositions.map((position) => (
              <div
                key={position.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 card-hover"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {position.title}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{position.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{position.type}</span>
                      </div>
                      <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs">
                        {position.department}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">{position.description}</p>
                  </div>
                  <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center gap-2">
                    Apply Now
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Don't See a Role That Fits?</h2>
          <p className="text-indigo-100 mb-6 max-w-2xl mx-auto">
            We're always looking for talented individuals. Send us your resume and we'll keep you in mind
            for future opportunities.
          </p>
          <a
            href="/contact"
            className="inline-block px-8 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Get in Touch
          </a>
        </div>
      </div>
    </div>
  );
}






