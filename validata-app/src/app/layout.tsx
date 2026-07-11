import "./globals.css";
import { ThemeProvider } from "../context/ThemeContext";

export const metadata = {
  // PLACEHOLDER — no live deployment exists yet. metadataBase must be a
  // valid URL (Next.js resolves relative asset paths like openGraph.images
  // against it), so this uses an obviously-fake host rather than one that
  // looks like a real, working deployment. Replace with the real production
  // URL once one exists.
  metadataBase: new URL('https://REPLACE-WITH-DEPLOYMENT-URL.example.com'),
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
