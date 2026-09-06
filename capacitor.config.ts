import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'es.osmin.app',
  appName: 'Osmin',
  webDir: 'dist-native',
  server: {
    /**
     * Origen del WebView: `capacitor://app.osmin.es`. El contenido sigue siendo
     * local — Capacitor intercepta el host, no se pide nada por red.
     *
     * NO intentes poner `iosScheme: 'https'` para que las cookies de
     * clerk.osmin.es dejen de ser de terceros: en iOS es imposible. Capacitor lo
     * descarta en silencio (CAPInstanceDescriptor.normalize) porque exige que
     * WKWebView no maneje ya ese esquema, y `https` lo maneja de forma nativa.
     * Ese consejo, que circula por foros, solo vale para Android.
     */
    hostname: 'app.osmin.es',
    androidScheme: 'https',
  },
};

export default config;
