import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const nextStubs = fileURLToPath(new URL('./next-stubs.jsx', import.meta.url));

/** @type {import('@storybook/nextjs').StorybookConfig} */
const config = {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  docs: {
    autodocs: true,
  },
  core: {
    disableTelemetry: true,
  },
  staticDirs: [],
  webpackFinal: async (config) => {
    config.cache = false;
    config.module.rules.push({
      test: /\.[jt]sx?$/,
      exclude: /node_modules/,
      use: {
        loader: require.resolve('babel-loader'),
        options: {
          presets: [[require.resolve('@babel/preset-react'), { runtime: 'automatic' }]],
        },
      },
    });
    config.resolve = {
      ...config.resolve,
      extensions: [...(config.resolve?.extensions || []), '.js', '.jsx'],
      alias: {
        ...config.resolve?.alias,
        'next/link': nextStubs,
        'next/image': nextStubs,
      },
    };
    return config;
  },
};

export default config;
