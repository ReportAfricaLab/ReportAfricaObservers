const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@reportafrica/shared'],
};

module.exports = withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  silent: true,
  org: process.env.SENTRY_ORG || 'reportafrica',
  project: process.env.SENTRY_PROJECT || 'reportafrica-web',
}, {
  // Sentry SDK options
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
