"use client"

import { useState } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

interface TopupModalProps {
  isOpen: boolean
  onClose: () => void
  walletAddress: string
  onTopupSuccess: (newCredits: number) => void
}

export function TopupModal({ isOpen, onClose, walletAddress, onTopupSuccess }: TopupModalProps) {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [amount, setAmount] = useState<string>("0.1")
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleTopUp = async () => {
    if (!publicKey || !sendTransaction) return

    setLoading(true)
    try {
      const solAmount = Number.parseFloat(amount)
      if (solAmount <= 0) {
        throw new Error("Amount must be greater than 0")
      }

      const treasuryWallet = new PublicKey("BUbC5ugi4tnscNowHrNfvNsU5SZfMfcnBv7NotvdWyq8") // Replace with your treasury wallet
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL)

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasuryWallet,
          lamports,
        }),
      )

      const signature = await sendTransaction(transaction, connection)
      console.log("[v0] Top-up transaction sent:", signature)

      await connection.confirmTransaction(signature, "confirmed")
      console.log("[v0] Top-up transaction confirmed:", signature)

      const supabase = createClient()

      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("id, credits")
        .eq("wallet_address", walletAddress)
        .single()

      let userId = existingUser?.id
      const currentCredits = existingUser?.credits || 0
      const newCredits = currentCredits + solAmount

      if (!existingUser || fetchError) {
        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert({
            wallet_address: walletAddress,
            username: walletAddress.slice(0, 8) + "...",
            total_pixels_owned: 0,
            total_spent: 0,
            credits: solAmount,
          })
          .select("id")
          .single()

        if (insertError) throw insertError
        userId = newUser?.id
      } else {
        const { error: updateError } = await supabase.from("users").update({ credits: newCredits }).eq("id", userId)

        if (updateError) throw updateError
      }

      console.log("[v0] Credits added successfully:", newCredits)
      onTopupSuccess(newCredits)
      onClose()
    } catch (error) {
      console.error("[v0] Top-up failed:", error)
      alert(`Top-up failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="p-6 bg-white border-4 border-black max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 comic-font">💰 TOP UP CREDITS</h2>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-2 cyber-font">Amount (SOL)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.001"
            step="0.001"
            className="w-full p-2 border-2 border-black font-mono"
            placeholder="0.1"
          />
        </div>

        <div className="bg-yellow-100 p-3 mb-4 border-2 border-black">
          <p className="text-sm cyber-font">
            <strong>How it works:</strong>
            <br />
            1. Send SOL to treasury wallet
            <br />
            2. Credits added to your account
            <br />
            3. Use credits to buy pixels instantly!
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleTopUp}
            disabled={loading || !amount || Number.parseFloat(amount) <= 0}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold border-2 border-black"
          >
            {loading ? "PROCESSING..." : `TOP UP ${amount} SOL`}
          </Button>
          <Button
            onClick={onClose}
            disabled={loading}
            variant="outline"
            className="border-2 border-black bg-white hover:bg-gray-100"
          >
            CANCEL
          </Button>
        </div>
      </Card>
    </div>
  )
}
