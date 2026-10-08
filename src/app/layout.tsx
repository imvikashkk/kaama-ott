import type { Metadata } from 'next';
import { Anton, Geist, Geist_Mono, Mukta, Poppins } from 'next/font/google';
import CampaignTracker from '@/components/CampaignTracker';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Site look (everything outside /auth): Anton for poster-style headings, Poppins + Mukta for text
const anton = Anton({
  variable: '--font-anton',
  weight: '400',
  subsets: ['latin'],
});

const poppins = Poppins({
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
});

const mukta = Mukta({
  variable: '--font-mukta',
  weight: ['400', '600', '800'],
  subsets: ['devanagari', 'latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://kaama.online'),
  title: 'Kaama OTT',
  description: 'Masti Hai To Mast Hai',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} ${poppins.variable} ${mukta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CampaignTracker />
      </body>
    </html>
  );
}
