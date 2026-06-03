const path = require('path');

const webRoot = path.resolve(__dirname, 'src/main/resources/web');
const webSrc = path.join(webRoot, 'src');

module.exports = {
  mode: 'development',
  devtool: false,
  entry: path.join(webSrc, 'app.ts'),
  output: {
    path: path.join(webRoot, 'dist'),
    filename: 'worldview.js',
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
};
