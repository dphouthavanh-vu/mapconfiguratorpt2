import type { NextConfig } from 'next';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import path from 'path';

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
              script-src 'self' 'unsafe-eval' 'unsafe-inline' *.cesium.com;
              connect-src 'self' *.cesium.com https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org https://nominatim.openstreetmap.org https://dev.virtualearth.net https://staticmap.openstreetmap.de;
              img-src 'self' *.cesium.com https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org https://staticmap.openstreetmap.de data:;
              style-src 'self' 'unsafe-inline';
            `.replace(/\s{2,}/g, ' ').trim(), // Clean up extra spaces
          },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Workers'),
              to: 'static/cesium/Workers',
            },
            {
              from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/ThirdParty'),
              to: 'static/cesium/ThirdParty',
            },
            {
              from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Assets'),
              to: 'static/cesium/Assets',
            },
            {
              from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Widgets'),
              to: 'static/cesium/Widgets',
            },
            {
              from: path.join(__dirname, 'node_modules/cesium/Build/Cesium/Cesium.js'),
              to: 'static/cesium/Cesium.js',
            },
          ],
        })
      );
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      cesium: path.resolve(__dirname, 'node_modules/cesium/Build/Cesium/Cesium.js'),
    };

    return config;
  },
};

export default nextConfig;