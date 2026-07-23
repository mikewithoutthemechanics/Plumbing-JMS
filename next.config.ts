import withPWA from 'next-pwa';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
};

const withConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
})(withConfig);
