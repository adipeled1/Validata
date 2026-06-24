import "./globals.css";
import { ThemeProvider } from "../context/ThemeContext";

export const metadata = {
  metadataBase: new URL('https://validata-pink.vercel.app'),
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
