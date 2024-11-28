/** @type {import('next').NextConfig} */

const nextConfig = {
  output: 'standalone', // Ensures it builds correctly for deployment
  trailingSlash: true, // Ensures Amplify correctly handles trailing slashes
  distDir: '.next', // Specifies the directory for build artifacts
  images: {
    unoptimized: true, // Amplify doesn't optimize images by default
  },
};

export default nextConfig;