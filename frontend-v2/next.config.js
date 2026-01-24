const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    styledComponents: false,
  },
  experimental: {
    esmExternals: false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  i18n: {
    locales: ['en', 'fr', 'es', 'de'],
    defaultLocale: 'en',
    localeDetection: false,
  },
  webpack: (config, { isServer }) => {
    // Ensure React is resolved from frontend-v2/node_modules for both client and server
    config.resolve.alias = {
      ...config.resolve.alias,
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    }
    return config
  },
}

module.exports = nextConfig
