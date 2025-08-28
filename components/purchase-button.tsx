"use client"

import { useState } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey, TransactionInstruction } from "@solana/web3.js"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface PurchaseButtonProps {
  selectedArea: { x: number; y: number; width: number; height: number } | null
  isValidSelection: boolean
  isAdmin?: boolean
  pixelBlocks: Array<{
    x: number
    y: number
    width: number
    height: number
    owner: string
    color: string
    image?: string
  }>
  onPurchaseSuccess: (block: {
    x: number
    y: number
    width: number
    height: number
    owner: string
    color: string
  }) => void
  onRetractPixels?: (area: { x: number; y: number; width: number; height: number }) => void
}

export function PurchaseButton({
  selectedArea,
  isValidSelection,
  isAdmin = false,
  pixelBlocks,
  onPurchaseSuccess,
  onRetractPixels,
}: PurchaseButtonProps) {
  const { connected, publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  const hasExistingPixels = () => {
    if (!selectedArea || !pixelBlocks || !Array.isArray(pixelBlocks)) return false
    return pixelBlocks.some(
      (block) =>
        block.x < selectedArea.x + selectedArea.width &&
        block.x + block.width > selectedArea.x &&
        block.y < selectedArea.y + selectedArea.height &&
        block.y + block.height > selectedArea.y,
    )
  }

  const handleRetract = async () => {
    if (!selectedArea || !isAdmin || !onRetractPixels) return

    setIsPurchasing(true)
    setPurchaseError(null)

    try {
      console.log(`[v0] Admin retracting pixels in area:`, selectedArea)
      await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate processing
      onRetractPixels(selectedArea)
    } catch (error) {
      console.error("[v0] Retract failed:", error)
      setPurchaseError("Failed to retract pixels")
    } finally {
      setIsPurchasing(false)
    }
  }

  const TREASURY_WALLET = new PublicKey("5zA5RkrFVF9n9eruetEdZFbcbQ2hNJnLrgPx1gc7AFnS") // Admin wallet as treasury

  const handlePurchase = async () => {
    if (!selectedArea || !publicKey || !connected) return

    setIsPurchasing(true)
    setPurchaseError(null)

    try {
      if (!isAdmin) {
        const pixelCount = selectedArea.width * selectedArea.height
        const costInSOL = pixelCount * 0.005 // Changed from 0.0001 to 0.005 SOL per pixel
        const costInLamports = Math.floor(costInSOL * LAMPORTS_PER_SOL)

        const transaction = new Transaction()

        const memoInstruction = new TransactionInstruction({
          keys: [],
          programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"), // Memo program
          data: Buffer.from(
            `Solana Eternal Canvas - Pixel Purchase: ${pixelCount} pixels at (${selectedArea.x},${selectedArea.y})`,
            "utf8",
          ),
        })

        const transferInstruction = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: TREASURY_WALLET,
          lamports: costInLamports,
        })

        transaction.add(memoInstruction, transferInstruction)

        const { blockhash } = await connection.getLatestBlockhash()
        transaction.recentBlockhash = blockhash
        transaction.feePayer = publicKey

        const signature = await sendTransaction(transaction, connection)

        await connection.confirmTransaction(signature, "confirmed")

        console.log(`[v0] Purchase successful! Transaction: ${signature}`)
      } else {
        console.log(`[v0] Admin purchase - no transaction required`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#ffa500", "#800080"]
      const randomColor = colors[Math.floor(Math.random() * colors.length)]

      const newBlock = {
        x: selectedArea.x,
        y: selectedArea.y,
        width: selectedArea.width,
        height: selectedArea.height,
        owner: publicKey.toString(),
        color: randomColor,
      }

      onPurchaseSuccess(newBlock)
    } catch (error) {
      console.error("[v0] Purchase failed:", error)
      setPurchaseError(error instanceof Error ? error.message : "Transaction failed")
    } finally {
      setIsPurchasing(false)
    }
  }

  if (!connected) {
    return (
      <Button disabled className="w-full bg-gray-400 text-black font-bold py-3 border-2 border-black shadow-lg">
        Connect Wallet First
      </Button>
    )
  }

  if (!isValidSelection) {
    return (
      <Button disabled className="w-full bg-gray-400 text-black font-bold py-3 border-2 border-black shadow-lg">
        Select Valid Area
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      {isAdmin && hasExistingPixels() ? (
        <Button
          onClick={handleRetract}
          disabled={isPurchasing}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 border-2 border-black shadow-lg disabled:bg-gray-400"
        >
          {isPurchasing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Retracting...
            </>
          ) : (
            "🗑️ RETRACT PIXELS (ADMIN)"
          )}
        </Button>
      ) : (
        <Button
          onClick={handlePurchase}
          disabled={isPurchasing}
          className={`w-full font-bold py-3 border-2 border-black shadow-lg disabled:bg-gray-400 ${
            isAdmin ? "bg-yellow-600 hover:bg-yellow-700 text-black" : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          {isPurchasing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : isAdmin ? (
            "👑 CLAIM PIXELS (ADMIN)"
          ) : (
            "🔒 LOCK PIXELS FOREVER"
          )}
        </Button>
      )}

      {purchaseError && (
        <Badge className="bg-red-500 text-white text-xs w-full justify-center">
          Error: {purchaseError.slice(0, 50)}...
        </Badge>
      )}

      {selectedArea && (
        <div className="text-sm text-center bg-white p-2 border-2 border-black rounded font-bold text-black">
          Cost:{" "}
          {isAdmin ? (
            <span className="text-green-600">FREE (Admin)</span>
          ) : (
            <span className="text-red-600">{(selectedArea.width * selectedArea.height * 0.005).toFixed(3)} SOL</span>
          )}
        </div>
      )}
    </div>
  )
}
