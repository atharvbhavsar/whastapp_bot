import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import Chatbot from "@/components/citizen/Chatbot";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "SCIRP+ Civic Command Center",
  description: "AI-Powered Governance Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <div className="civic-app">
            <Chatbot />
          </div>
          <Toaster richColors position="top-center" />
          <Chatbot />
        </ThemeProvider>
      </body>
    </html>
  );
}
