import { ThemeProvider } from "@/contexts/ThemeContext";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionAuthProvider } from "@/components/providers/SessionAuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Embassy of India Leave Management System",
  description: "Employee Leave Management System",
  icons: {
    icon: "/title_logo.png", // Replace with your actual logo path, e.g., "/logo.png" or "/logo.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=window.location.pathname;if(p==="/login"||p==="/"||p.startsWith("/login")){document.documentElement.setAttribute("data-theme","light");return;}var t=localStorage.getItem("lms-theme")||"light";document.documentElement.setAttribute("data-theme",t);}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <SessionAuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SessionAuthProvider>
      </body>
    </html>
  );
}
