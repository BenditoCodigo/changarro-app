/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.benditocodigo.changarro',
  productName: 'Changarro',
  compression: 'maximum',
  directories: {
    output: 'dist',
    buildResources: 'assets',
  },
  files: [
    'build/**/*',
    'app/**/*',
    'generated/**/*',
    'assets/**/*',
    'package.json',
    { from: 'vendor/node_modules', to: 'node_modules' },
  ],
  dmg: {
    format: 'ULFO',
  },
  mac: {
    category: 'public.app-category.business',
    target: [
      {
        target: 'dmg',
        arch: ['arm64'],
      },
    ],
  },
};
