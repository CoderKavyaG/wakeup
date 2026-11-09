import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "next-auth/react";
import { ClientBootstrap } from "@/components/ClientBootstrap";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wakeup | Developer Operating System",
  description: "A personal developer operating system and cockpit",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SessionProvider>
          <TooltipProvider>
            <ClientBootstrap />
            {children}
          </TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
