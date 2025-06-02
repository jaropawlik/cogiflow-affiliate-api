/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only build API routes, no pages
  output: 'standalone',
  
  // Environment variables
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  // Disable unused features for API-only setup
  images: {
    unoptimized: true,
  },
  
  // CORS headers for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Configure this to your domain in production
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  
  // Redirects for root path
  async redirects() {
    return [
      {
        source: '/',
        destination: 'https://cogiflow.ai',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig; 