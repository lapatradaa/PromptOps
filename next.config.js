// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Build-time environment vars for the browser
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_FASTAPI_URL: process.env.NEXT_PUBLIC_FASTAPI_URL,
    NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY,
    FASTAPI_URL: process.env.FASTAPI_URL,
  },

  rewrites: async () => [
  ],

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
