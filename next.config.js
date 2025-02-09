/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add environment variables
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
  },
  // Updated rewrites configuration
  rewrites: async () => {
    return [
      // Skip auth routes by only targeting specific API paths you want to forward to Flask
      // Add your specific Flask API routes here
      {
        source: '/api/signin',
        destination: 'http://127.0.0.1:5328/api/signin'
      },
      {
        source: '/api/signup',
        destination: 'http://127.0.0.1:5328/api/signup'
      },
      {
        source: '/api/verify',
        destination: 'http://127.0.0.1:5328/api/verify'
      }
    ]
  },
  // Keep existing webpack configuration
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false
    } else {
      config.cache = {
        type: 'filesystem',
        version: '1.0.0',
        compression: false,
        buildDependencies: {
          config: [__filename]
        }
      }
    }
    return config
  }
}

module.exports = nextConfig