"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

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
    transaction_signature?: string
  }) => void
  onRetractPixels?: (area: { x: number; y: number; width: number; height: number }) => void
  userCredits: number
  onCreditsUpdate: (newCredits: number) => void
}

export function PurchaseButton({
  selectedArea,
  isValidSelection,
  isAdmin = false,
  pixelBlocks,
  onPurchaseSuccess,
  onRetractPixels,
  userCredits,
  onCreditsUpdate,
}: PurchaseButtonProps) {
  const { connected, publicKey } = useWallet()
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

  const handlePurchase = async () => {
    if (!selectedArea || !publicKey || !connected) return

    setIsPurchasing(true)
    setPurchaseError(null)

    try {
      const pixelCount = selectedArea.width * selectedArea.height
      const creditsNeeded = isAdmin ? Math.ceil(pixelCount * 0.1) : pixelCount * 50

      console.log(`[v0] Starting credit-based purchase for ${pixelCount} pixels, cost: ${creditsNeeded} credits`)

      // Check if user has enough credits
      if (userCredits < creditsNeeded) {
        setPurchaseError(`Insufficient credits. Need ${creditsNeeded}, have ${userCredits}`)
        return
      }

      // Deduct credits from user's balance
      const supabase = createClient()
      const newCreditsBalance = userCredits - creditsNeeded

      const { error: updateError } = await supabase
        .from("users")
        .update({ credits: newCreditsBalance })
        .eq("wallet_address", publicKey.toString())

      if (updateError) {
        console.error("[v0] Failed to deduct credits:", updateError)
        setPurchaseError("Failed to deduct credits from account")
        return
      }

      console.log(`[v0] Successfully deducted ${creditsNeeded} credits. New balance: ${newCreditsBalance}`)

      // Update local credits state
      onCreditsUpdate(newCreditsBalance)

      const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#ffa500", "#800080"]
      const randomColor = colors[Math.floor(Math.random() * colors.length)]

      const newBlock = {
        x: selectedArea.x,
        y: selectedArea.y,
        width: selectedArea.width,
        height: selectedArea.height,
        owner: publicKey.toString(),
        color: randomColor,
        transaction_signature: `credit_purchase_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`, // Credit-based purchase ID
      }

      console.log(`[v0] Credit-based purchase successful! Block created:`, newBlock)
      onPurchaseSuccess(newBlock)
    } catch (error) {
      console.error("[v0] Purchase failed:", error)
      setPurchaseError(error instanceof Error ? error.message : "Purchase failed")
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

  const pixelCount = selectedArea ? selectedArea.width * selectedArea.height : 0
  const creditsNeeded = isAdmin ? Math.ceil(pixelCount * 0.1) : pixelCount * 50
  const hasEnoughCredits = userCredits >= creditsNeeded

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
          disabled={isPurchasing || !hasEnoughCredits}
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
            "👑 BUY PIXELS (ADMIN)"
          ) : (
            "🔒 BUY WITH CREDITS"
          )}
        </Button>
      )}

      {purchaseError && (
        <Badge className="bg-red-500 text-white text-xs w-full justify-center">
          Error: {purchaseError.slice(0, 50)}...
        </Badge>
      )}

      {!hasEnoughCredits && selectedArea && (
        <Badge className="bg-orange-500 text-white text-xs w-full justify-center">
          Need {creditsNeeded - userCredits} more credits
        </Badge>
      )}

      {selectedArea && (
        <div className="text-sm text-center bg-white p-2 border-2 border-black rounded font-bold text-black">
          Cost: <span className={hasEnoughCredits ? "text-green-600" : "text-red-600"}>{creditsNeeded} Credits</span>
          <div className="text-xs text-gray-600 mt-1">Your Balance: {userCredits} Credits</div>
        </div>
      )}
    </div>
  )
}
