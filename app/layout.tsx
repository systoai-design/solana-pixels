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
  title: "Aurify Pixel - Own 1M Pixels Forever on Solana Blockchain | Digital Advertising Canvas",
  description:
    "Buy and own pixels forever on the Solana blockchain using AURIFY tokens. 1,000,000 pixels available at 1 credit each (10,000 AURIFY tokens). Upload images, add links, create hover messages. Real-time visitor tracking and competitive pixel wars. Start your digital advertising campaign today!",
  generator: "v0.app",
  keywords: "Solana, blockchain, pixels, digital advertising, NFT, crypto, canvas, pixel art, AURIFY, credits",
  openGraph: {
    title: "Aurify Pixel - Own 1M Pixels Forever on Solana",
    description:
      "Buy pixels on the Solana blockchain using AURIFY tokens. Upload images, add links, create ads. 1 credit per pixel.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aurify Pixel - Own 1M Pixels Forever on Solana",
    description:
      "Buy pixels on the Solana blockchain using AURIFY tokens. Upload images, add links, create ads. 1 credit per pixel.",
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
