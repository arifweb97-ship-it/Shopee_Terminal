import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
  display: 'swap',
  variable: '--font-jetbrains',
});

export const metadata = {
  title: 'Shopee Terminal',
  description: 'Dashboard analisis komisi affiliate Shopee. Breakdown performa taglink, channel, dan trend harian.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={jetbrainsMono.className}>{children}</body>
    </html>
  );
}
