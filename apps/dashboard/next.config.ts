import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@communication/types', '@communication/shared', '@communication/utils'],
};

export default nextConfig;
