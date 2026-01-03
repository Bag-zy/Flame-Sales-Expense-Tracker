import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.flame',
  appName: 'Flame Sales & Expense Tracker',
  webDir: 'public',
  server: {
    // Use your deployed Cloudflare/Next PWA URL
    url: 'https://flame-sales-and-expense-tracker.bagumajonah3.workers.dev/',
    cleartext: false
  }
};

export default config;