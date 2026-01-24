const path = require('path')

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr', 'es', 'de'],
  },
  localePath: path.resolve('./public/locales'),
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  saveMissing: false,
  strictMode: true,
  serializeConfig: false,
  react: {
    useSuspense: false,
  },
}