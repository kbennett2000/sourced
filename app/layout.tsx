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
      <body>{children}</body>
    </html>
  );
}
