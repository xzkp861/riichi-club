const path = require('path')

module.exports = {
  projectName: 'bos-riichi-mini',
  date: '2026-09-29',
  designWidth: 750,
  deviceRatio: { 750: 1 },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: 'webpack5',
  plugins: [],
  alias: { '@': path.resolve(__dirname, '..', 'src') },
  mini: {},
  h5: {},
}
