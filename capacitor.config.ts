
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hi360.studio',
  appName: 'Hi360 Studio',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    buildOptions: {
      keystorePath: 'release-key.keystore',
      keystoreAlias: 'hi360',
    }
  }
};

export default config;
