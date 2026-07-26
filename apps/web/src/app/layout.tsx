import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Who? - The Ultimate Music Guessing & Betting Party Game',
  description:
    'Jogo casual multiplayer de música, percepção social e apostas entre amigos inspirados em Stopots e Gartic.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased selection:bg-yellow-400 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
