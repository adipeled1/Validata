import "./globals.css";

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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
