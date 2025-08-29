"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js"

export function WalletButton() {
  const { connected, publicKey, disconnect, connecting, wallet } = useWallet()
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    console.log("[v0] Wallet state changed:", {
      connected,
      connecting,
      wallet: wallet?.adapter?.name,
      publicKey: publicKey?.toString(),
    })
  }, [connected, connecting, wallet, publicKey])

  useEffect(() => {
    if (connected && publicKey) {
      const connection = new Connection("https://api.devnet.solana.com")

      const getBalance = async () => {
        try {
          console.log("[v0] Fetching balance for:", publicKey.toString())
          const balance = await connection.getBalance(publicKey)
          setBalance(balance / LAMPORTS_PER_SOL)
          console.log("[v0] Balance fetched:", balance / LAMPORTS_PER_SOL, "SOL")
        } catch (error) {
          console.error("[v0] Error fetching balance:", error)
        }
      }

      getBalance()
    } else {
      setBalance(null)
    }
  }, [connected, publicKey])

  if (connected && publicKey) {
    return (
      <div className="text-center space-y-3">
        <Badge className="bg-green-600 text-white mb-2 block">✅ WALLET CONNECTED</Badge>

        <div className="bg-white p-3 border-2 border-black rounded">
          <p className="font-bold text-sm">Address:</p>
          <p className="text-xs font-mono break-all">
            {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
          </p>
          {balance !== null && (
            <p className="text-sm mt-2">
              <span className="font-bold">Balance:</span> {balance.toFixed(4)} SOL
            </p>
          )}
        </div>

        <Button
          onClick={disconnect}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 border-2 border-black shadow-lg"
          size="sm"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="wallet-adapter-button-trigger">
      <WalletMultiButton
        className="!w-full !bg-blue-600 hover:!bg-blue-700 !text-white !font-bold !py-4 !px-6 !border-3 !border-black !shadow-lg !rounded-none !text-lg"
        onClick={() => {
          console.log("[v0] Wallet connect button clicked")
        }}
      />
      {connecting && (
        <div className="mt-2 text-center">
          <Badge className="bg-yellow-500 text-black">🔄 CONNECTING...</Badge>
        </div>
      )}
    </div>
  )
}
