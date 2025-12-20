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
}

module.exports = nextConfig
