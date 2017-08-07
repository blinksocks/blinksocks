const path = require('path');
const webpack = require('webpack');
const BabiliPlugin = require('babili-webpack-plugin');

module.exports = {

  bail: true,

  devtool: 'source-map',

  target: 'node',

  entry: {
    'blinksocks': './src/index.js'
  },

  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js',
    libraryTarget: 'commonjs2'
  },

  resolve: {
    extensions: ['.js'],
    modules: ['node_modules']
  },

  module: {

    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        loader: require.resolve('eslint-loader'),
        include: [
          path.resolve(__dirname, 'bin'),
          path.resolve(__dirname, 'src')
        ]
      },
      {
        test: /\.js$/,
        loader: require.resolve('babel-loader'),
        exclude: [
          /node_modules/,
          /__mocks__/,
          /__tests__/
        ]
      }
    ]

  },

  performance: {
    hints: false
  },

  plugins: [
    new BabiliPlugin(),
    new webpack.BannerPlugin({
      banner: 'Copyright (c) 2016-present, [name]. All rights reserved.\n\nname: [file]\nhash: [hash]',
      entryOnly: true
    })
  ]

};
