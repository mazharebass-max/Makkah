/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@haramain/ui"],
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
