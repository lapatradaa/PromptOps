/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add environment variables
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
  },
  
  // Keep existing rewrites
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://127.0.0.1:5328/api/:path*'
            : '/api/',
      },
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