import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { RegisterSW } from "@/components/RegisterSW";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hontalin - Layer Farm",
  description: "Sistem manajemen peternakan ayam layer modern",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hontalin",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        {/* Capture beforeinstallprompt before React bundle loads */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__pwa_prompt=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwa_prompt=e;window.dispatchEvent(new CustomEvent('pwa-installable'));});window.addEventListener('appinstalled',function(){window.__pwa_prompt=null;window.dispatchEvent(new CustomEvent('pwa-installed'));});`,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
        <RegisterSW />
      </body>
    </html>
  );
}
