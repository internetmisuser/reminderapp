import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata = {
  title: 'PulseTask — Persistent Multi-Tenant Task Portal',
  description:
    'Todoist-inspired task manager with high-frequency overdue reminders',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}