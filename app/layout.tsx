import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sourced",
  description:
    "A grounded answer engine: ask a question, get a streamed answer with inline citations, powered by the Brave Search API.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
