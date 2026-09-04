import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { OnlineStatusManager } from "@/components/OnlineStatusManager";
import { SettingsManager } from "@/components/SettingsManager";
import { AnnouncementsDisplay } from "@/components/AnnouncementsDisplay";
import { VisitTracker } from "@/components/VisitTracker";
import { ClerkErrorBoundary } from "@/components/ClerkErrorBoundary";
import { StatusBanner } from "@/components/StatusBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Portfolio Network - Showcase Your Professional Profile",
  description: "A professional portfolio and networking platform for individuals and businesses",
};

// Pages depend on request-scoped Clerk and Supabase state and should not be
// executed during static generation (which may not have runtime credentials).
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
    >
      <ClerkErrorBoundary>
        <html lang="en" suppressHydrationWarning>
          <head>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  (function() {
                    try {
                      const theme = localStorage.getItem('theme');
                      if (theme === 'dark') {
                        document.documentElement.classList.add('dark');
                      } else if (theme === 'light') {
                        document.documentElement.classList.remove('dark');
                      } else {
                        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        if (prefersDark) {
                          document.documentElement.classList.add('dark');
                        } else {
                          document.documentElement.classList.remove('dark');
                        }
                      }
                    } catch (e) {}
                  })();
                `,
              }}
            />
          </head>
          <body className={inter.className}>
            <SettingsManager />
            <OnlineStatusManager />
            <VisitTracker />
            {/* Global Announcements (Top Bar & Modal) */}
            <AnnouncementsDisplay displayTypes={['top_bar', 'modal']} />
            <Navbar />
            {/* System Status Banner - Renders on all pages when display_on_all_pages is enabled */}
            <StatusBanner renderLocation="layout" />
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
          </body>
        </html>
      </ClerkErrorBoundary>
    </ClerkProvider>
  );
}

