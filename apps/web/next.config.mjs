/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@haramain/ui"],
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      {
        source: "/signup",
        destination: "/login?mode=signup",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
