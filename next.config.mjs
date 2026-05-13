/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
    outputFileTracingIncludes: {
      '/': ['./data/**/*.json'],
      '/api/**/*': ['./data/**/*.json'],
      '/evolutie': ['./data/**/*.json'],
      '/vergelijking': ['./data/**/*.json'],
    },
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({ 'pdf-parse': 'commonjs pdf-parse' });
    return config;
  },
};
export default nextConfig;
