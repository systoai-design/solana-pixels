"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useState, useEffect } from "react"
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js"

export function WalletButton() {
  const { connected, publicKey, disconnect, connecting, wallet } = useWallet()
  const [balance, setBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

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
      const connection = new Connection("https://solana-rpc.publicnode.com", "confirmed")

      const getBalance = async () => {
        try {
          setBalanceLoading(true)
          console.log("[v0] Fetching balance for:", publicKey.toString())
          const balance = await connection.getBalance(publicKey)
          const solBalance = balance / LAMPORTS_PER_SOL
          setBalance(solBalance)
          console.log("[v0] Balance fetched:", solBalance, "SOL")
        } catch (error) {
          console.error("[v0] Error fetching balance:", error)
          try {
            const fallbackConnection = new Connection("https://solana.drpc.org", "confirmed")
            const fallbackBalance = await fallbackConnection.getBalance(publicKey)
            const fallbackSolBalance = fallbackBalance / LAMPORTS_PER_SOL
            setBalance(fallbackSolBalance)
            console.log("[v0] Fallback balance fetched:", fallbackSolBalance, "SOL")
          } catch (fallbackError) {
            console.error("[v0] Fallback balance fetch failed:", fallbackError)
            setBalance(0)
          }
        } finally {
          setBalanceLoading(false)
        }
      }

      getBalance()

      const interval = setInterval(getBalance, 60000)
      return () => clearInterval(interval)
    } else {
      setBalance(null)
      setBalanceLoading(false)
    }
  }, [connected, publicKey])

  if (connected && publicKey) {
    return (
      <div className="text-center space-y-4">
        <div className="retro-border bg-white p-1">
          <div className="bg-green-400 text-black py-2 px-4 comic-font text-sm font-bold text-center">
            ● WALLET CONNECTED
          </div>
        </div>

        <div className="retro-border bg-white p-4">
          <div className="space-y-3">
            <div>
              <p className="comic-font font-bold text-sm text-black mb-1">WALLET ADDRESS</p>
              <div className="bg-gray-200 border-2 border-gray-400 p-2 cyber-font text-xs break-all text-black">
                {publicKey.toString().slice(0, 16)}...{publicKey.toString().slice(-16)}
              </div>
            </div>

            <div>
              <p className="comic-font font-bold text-sm text-black mb-1">BALANCE</p>
              {balanceLoading ? (
                <div className="bg-yellow-200 border-2 border-yellow-400 p-2 text-center">
                  <span className="comic-font text-sm text-black blink">Loading...</span>
                </div>
              ) : (
                <div className="bg-blue-100 border-2 border-blue-400 p-2">
                  <span className="cyber-font font-bold text-black">
                    {balance !== null ? `${balance.toFixed(4)} SOL` : "0.0000 SOL"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <button onClick={disconnect} className="retro-button w-full py-3 px-4 text-black comic-font text-sm">
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="wallet-adapter-button-trigger space-y-4">
      <div className="retro-border bg-white p-1">
        <WalletMultiButton
          className="!w-full !bg-blue-500 hover:!bg-blue-600 !text-white !font-bold !py-3 !px-4 !border-2 !border-black !comic-font !text-sm !cursor-pointer"
          onClick={() => {
            console.log("[v0] Wallet connect button clicked")
          }}
        />

        {connecting && (
          <div className="absolute inset-0 bg-yellow-300 border-2 border-black flex items-center justify-center">
            <div className="text-center">
              <div className="comic-font font-bold text-black text-lg blink">CONNECTING...</div>
              <div className="comic-font text-black text-xs">Please approve in your wallet</div>
            </div>
          </div>
        )}
      </div>

      {!connecting && (
        <div className="text-center">
          <div className="retro-border bg-white p-3">
            <p className="comic-font text-black text-sm font-bold mb-2">Connect your Solana wallet to get started</p>
            <div className="flex justify-center gap-2">
              <span className="bg-purple-300 border-2 border-purple-500 px-2 py-1 comic-font text-xs text-black">
                Phantom
              </span>
              <span className="bg-blue-300 border-2 border-blue-500 px-2 py-1 comic-font text-xs text-black">
                Solflare
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
