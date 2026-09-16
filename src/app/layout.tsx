import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

/**
 * The whole site runs on two faces. Fraunces with its SOFT and WONK axes
 * turned up is the storybook display serif — the same cut that gets baked into
 * the generated cover art in `scripts/generate-art.mjs`, so headings on the
 * page and lettering inside the pictures are the same typeface.
 */
const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
  display: "swap",
});

const sans = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Story Kiddo Custom Books",
    template: "%s · Story Kiddo",
  },
  description:
    "Personalized educational storybooks starring your child — alphabet, numbers, emotions, milestones, and more.",
  icons: {
    icon: "/favicon.svg",
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
      className={`${display.variable} ${sans.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
