
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        parser: {
          javascript: {
            worker: ["AudioWorklet() from audio-worklet", "..."]
          }
        }
      }
    ]
  }
};
