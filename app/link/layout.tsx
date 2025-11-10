import type { Metadata } from "next"
import "../globals.css"

export const metadata: Metadata = {
  title: "mkrs.link – A gathering for builders, founders, and creatives",
  description:
    "Connect with the next generation of doers shaping Nebraska's future. December 2, 2025 at The Talon Room, Lincoln NE.",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="satoshi-font antialiased">
        {children}
      </body>
    </html>
  )
}
