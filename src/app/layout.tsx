import type { Metadata } from "next";
import { Averia_Serif_Libre, Baloo_2, Fraunces, Nunito } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const sans = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

/** Hand-drawn serif used for book-cover titles, the way picture books set them. */
const cover = Averia_Serif_Libre({
  variable: "--font-averia",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

/** Rounded storybook face for read-aloud text on book pages. */
const story = Baloo_2({
  variable: "--font-baloo",
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
      className={`${display.variable} ${sans.variable} ${cover.variable} ${story.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
