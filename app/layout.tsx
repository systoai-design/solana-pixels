import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Comic_Neue, Orbitron, Jersey_10 } from "next/font/google"
import { SolanaWalletProvider } from "@/components/wallet-provider"
import "./globals.css"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

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
  title: "SOL Pixel - Own 1M Pixels Forever on Solana Blockchain | Digital Advertising Canvas",
  description: "Buy and own pixels forever on the Solana blockchain using PIXEL tokens.", // Added missing comma after description
  generator: "Pixel Team",
  keywords: "Solana, blockchain, pixels, digital advertising, NFT, crypto, canvas, pixel art, SOL, credits",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/favicon.ico", sizes: "16x16", type: "image/x-icon" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "SOL Pixel - Own 1M Pixels Forever on Solana",
    description: "Buy and own pixels forever on the Solana blockchain using PIXEL tokens.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SOL Pixel - Own 1M Pixels Forever on Solana",
    description: "Buy and own pixels forever on the Solana blockchain using PIXEL tokens.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${comicNeue.variable} ${orbitron.variable} ${jersey10.variable}`}
    >
      <body>
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  )
}
