const path = require('path');
const webpack = require('webpack');
const BabiliPlugin = require('babili-webpack-plugin');
const {version} = require('./package.json');

module.exports = {

  bail: true,

  devtool: 'source-map',

  target: 'node',

  entry: {
    'blinksocks': './bin/cli.js'
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
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'pkg')
        ]
      },
      {
        test: /\.js$/,
        loader: require.resolve('babel-loader')
      }
    ]

  },

  performance: {
    hints: false
  },

  plugins: [
    new BabiliPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'global.__WEBPACK__': JSON.stringify(true),
      'global.__VERSION__': JSON.stringify(version)
    }),
    new webpack.IgnorePlugin(/__mocks__/, /__tests__/),
    new webpack.BannerPlugin({
      banner: [
        'Copyright (c) 2016-present, [name]. All rights reserved.\n',
        'name: [file]',
        `version: v${version}`,
        'hash: [hash]'
      ].join('\n'),
      entryOnly: true
    })
  ]

};
