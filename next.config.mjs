/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the legacy strict-TypeScript backlog visible via `npm run typecheck`
  // without blocking production builds while it is addressed incrementally.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;






