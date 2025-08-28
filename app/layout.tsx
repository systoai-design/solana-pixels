import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Comic_Neue, Orbitron, Jersey_10 } from "next/font/google"
import { SolanaWalletProvider } from "@/components/wallet-provider"
import "./globals.css"

const comicNeue = Comic_Neue({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-comic",
  display: "swap",
})

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-orbitron",
  display: "swap",
})

const jersey10 = Jersey_10({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jersey",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Sol Pixel - Own 1M Pixels Forever on Solana",
  description:
    "Buy and own pixels forever on the Solana blockchain. 1,000,000 pixels available for 0.005 SOL each. Upload your art anytime!",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${comicNeue.variable} ${orbitron.variable} ${jersey10.variable}`}>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  )
}
