import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/lib/providers/query-provider";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export const metadata: Metadata = {
  title: {
    default: "CateringHub",
    template: "%s | CateringHub",
  },
  description:
    "The complete management solution for catering businesses. Streamline operations, manage inventory, and delight your customers.",
  keywords: [
    "catering",
    "management",
    "business",
    "inventory",
    "orders",
    "customers",
  ],
  authors: [{ name: "CateringHub Team" }],
  creator: "CateringHub",
  publisher: "CateringHub",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  openGraph: {
    title: "CateringHub",
    description: "The complete management solution for catering businesses",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "CateringHub",
    description: "The complete management solution for catering businesses",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <NuqsAdapter>
          <QueryProvider>
            <Toaster />
            {children}
          </QueryProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
