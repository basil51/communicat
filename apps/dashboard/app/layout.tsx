import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Communication Service',
  description: 'SparkCo unified messaging dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
