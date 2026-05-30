import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: workspaceRoot,
  serverExternalPackages: ['pdf-parse'],
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
