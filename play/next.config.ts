import type { NextConfig } from 'next'
import { BASE } from './lib/base'

const config: NextConfig = {
  basePath: BASE,
  poweredByHeader: false,
  devIndicators: false,
  // This app has its own package.json inside the main site's repo.
  turbopack: { root: process.cwd() },
}

export default config
