import type { ReactNode } from 'react';
import '../src/style.css';
import '../src/learning.css';
export const metadata = {
  title: 'Number Theory · Jerome Group',
  description: 'A rigorous, interactive atlas of elementary number theory.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
