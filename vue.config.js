const { defineConfig } = require('@vue/cli-service');
const webpack = require('webpack');

module.exports = defineConfig({
  publicPath: '',
  transpileDependencies: true,
  configureWebpack: {
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer']
      }),
      new webpack.ProvidePlugin({
        process: 'process/browser'
      })
    ],
    resolve: {
      fallback: {
        "path": require.resolve("path-browserify"),
        "fs": false,
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
      }
    },   
  },
  pluginOptions: {
    webpackBundleAnalyzer: {
        analyzerMode: "disabled"
      }
  },
})
