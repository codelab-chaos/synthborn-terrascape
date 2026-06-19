const path = require('path');
const webpack = require('webpack');
const { execSync } = require('child_process');
const manifest = require('./src/main/resources/manifest.json');

const webRoot = path.resolve(__dirname, 'src/main/resources/web');
const webSrc = path.join(webRoot, 'src');

function gitDescribe() {
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    const dirty = execSync('git status --porcelain', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim().length > 0;
    return dirty ? `${sha}-dirty` : sha;
  } catch {
    return 'unknown';
  }
}

const buildInfo = {
  version: manifest.Version,
  channel: 'early access',
  sha: gitDescribe(),
  time: new Date().toISOString(),
};

module.exports = {
  mode: 'development',
  devtool: false,
  entry: path.join(webSrc, 'app.ts'),
  output: {
    path: path.join(webRoot, 'dist'),
    filename: 'terrascape.js',
    clean: true,
    chunkFormat: 'module',
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
  externalsType: 'module',
  externals: [
    ({ request }, callback) => {
      if (request === 'three' || request?.startsWith('three/addons/')) {
        callback(null, request);
        return;
      }
      callback();
    },
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
  },
  optimization: {
    minimize: false,
    runtimeChunk: false,
    splitChunks: false,
  },
  plugins: [
    new webpack.DefinePlugin({
      __BUILD_INFO__: JSON.stringify(buildInfo),
    }),
  ],
};
