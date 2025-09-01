/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... any other configs you might have
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/images/**', // This specifies the path prefix for your images
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/files/**', // This handles files (PDFs, documents, etc.)
      },
    ],
  },
};

module.exports = nextConfig;