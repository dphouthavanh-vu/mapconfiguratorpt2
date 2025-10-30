import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';

              script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: *.googleapis.com *.google.com;
              worker-src 'self' blob: *.googleapis.com;

              connect-src
                'self'
                *.googleapis.com
                *.google.com
                *.gstatic.com;

              img-src
                'self'
                blob:
                data:
                *.googleapis.com
                *.google.com
                *.gstatic.com;

              style-src 'self' 'unsafe-inline' *.googleapis.com;

              font-src 'self' data: *.googleapis.com *.gstatic.com;
            `.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;