const vercelEnvironment = process.env.VERCEL_ENV;
const appEnvironment = vercelEnvironment === 'production'
  ? 'production'
  : vercelEnvironment === 'preview'
    ? 'staging'
    : vercelEnvironment === 'development'
      ? 'development'
      : process.env.APP_ENV ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development');

process.env.EXPO_PUBLIC_APP_ENV = appEnvironment;

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    appEnvironment,
  },
});
