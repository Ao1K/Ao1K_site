// import bundleAnalyzer from '@next/bundle-analyzer';
/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true, // Optional but recommended
  // output: 'standalone', // Ensures it builds correctly for deployment
  trailingSlash: true, // Ensures Amplify correctly handles trailing slashes
  distDir: '.next', // Specifies the directory for build artifacts
  basePath: '',
  assetPrefix: '',
  images: {
    unoptimized: true, // Amplify doesn't optimize images by default
  },
  allowedDevOrigins: ['http://192.168.1.107:3000', 'http://localhost:3000'],
};

// const withBundleAnalyzer = bundleAnalyzer({
//   enabled: process.env.ANALYZE === 'true',
// });
// export default withBundleAnalyzer({
//   nextConfig
// });

export default nextConfig;