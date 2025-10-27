import './globals.css';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';


export const metadata = {
  title: 'mkrs.world',
  description: 'Connect. Create. Collaborate. Join a community of makers, builders, and creators.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Geist:wght@100..900&display=swap" rel="stylesheet" />
        <style>{`
          @font-face {
            font-family: 'Satoshi Variable';
            src: url('/fonts/Satoshi-Variable.ttf') format('truetype');
            font-weight: 100 900;
            font-style: normal;
          }
        `}</style>
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
