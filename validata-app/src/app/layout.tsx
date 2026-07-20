import "./globals.css";
import { ThemeProvider } from "../context/ThemeContext";

// Resolution order: an explicit NEXT_PUBLIC_SITE_URL (set this if/when you
// point a custom domain at the deployment) -> VERCEL_URL (auto-injected by
// Vercel on every deployment, preview or production, with that deployment's
// own real URL - no manual setup needed, correct from the very first deploy)
// -> localhost for local dev. metadataBase must be a valid URL (Next.js
// resolves relative asset paths like openGraph.images against it), so this
// never leaves it as a placeholder that looks like a real, broken host.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || 'http://localhost:3000';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "Validata | Clinical Trial Dashboard",
  description: "Secure portal for managing participants, logging measurements, and analyzing clinical data.",
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    images: '/og-image.jpg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
