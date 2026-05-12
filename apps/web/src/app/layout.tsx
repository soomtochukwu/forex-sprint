import type { Metadata } from 'next';
import { Roboto_Mono, Inter } from 'next/font/google';
import './globals.css';

import { Navbar } from '@/components/navbar';
import { WalletProvider } from "@/components/wallet-provider"
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const robotoMono = Roboto_Mono({ 
  subsets: ['latin'],
  variable: '--font-roboto-mono',
});

export const metadata: Metadata = {
  title: 'Forex Sprint | MiniPay',
  description: 'Gamified DEX Arbitrage on Celo',
  other: {
    'talentapp:project_verification': '8928f8ff1b1549b41f927f02d3b01e45f6fd41d2a873c2d0dea85bcb1b629b378ceea8bd39f5c4262354d01882b868d31f3e97b2fde53f131b990724d7a3cfaf',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark", "font-sans", inter.variable)}>
      <body className={`${robotoMono.variable} font-mono antialiased`}>
        <div className="relative flex min-h-screen flex-col">
          <WalletProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </WalletProvider>
        </div>
      </body>
    </html>
  );
}
