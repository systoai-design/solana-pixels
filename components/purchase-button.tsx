"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
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

  const getExistingBlocks = () => {
    if (!selectedArea || !pixelBlocks || !Array.isArray(pixelBlocks)) return []
    return pixelBlocks.filter(
      (block) =>
        block.x < selectedArea.x + selectedArea.width &&
        block.x + block.width > selectedArea.x &&
        block.y < selectedArea.y + selectedArea.height &&
        block.y + block.height > selectedArea.y,
    )
  }

  const isPurchaseWar = () => {
    const existingBlocks = getExistingBlocks()
    return existingBlocks.length > 0 && existingBlocks.some((block) => block.owner !== publicKey?.toString())
  }

  const getExistingOwners = () => {
    const existingBlocks = getExistingBlocks()
    const owners = [...new Set(existingBlocks.map((block) => block.owner))]
    return owners.filter((owner) => owner !== publicKey?.toString())
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
      const creditsNeeded = isAdmin ? Math.ceil(pixelCount * 0.001) : Math.ceil(pixelCount * 0.01)
      const isWar = isPurchaseWar()

      console.log(
        `[v0] Starting ${isWar ? "purchase war" : "new purchase"} for ${pixelCount} pixels, cost: ${creditsNeeded} credits`,
      )

      // Check if user has enough credits
      if (userCredits < creditsNeeded) {
        setPurchaseError(`Insufficient credits. Need ${creditsNeeded}, have ${userCredits}`)
        return
      }

      const response = await fetch("/api/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedArea,
          publicKey: publicKey.toString(),
          isWar,
          userCredits,
          creditsNeeded,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setPurchaseError(data.error || "Purchase failed.")
        return
      }

      const newCreditsBalance = data.newCreditsBalance
      const transactionSignature = data.transactionSignature

      console.log(`[v0] Purchase successful! New balance: ${newCreditsBalance}`)

      // Update local credits state
      onCreditsUpdate(newCreditsBalance)

      const newBlock = {
        x: selectedArea.x,
        y: selectedArea.y,
        width: selectedArea.width,
        height: selectedArea.height,
        owner: publicKey.toString(),
        color: "#ff0000", // Default color
        transaction_signature: transactionSignature,
      }

      console.log(`[v0] ${isWar ? "Purchase war" : "Credit-based purchase"} successful! Block created:`, newBlock)
      onPurchaseSuccess(newBlock)
    } catch (error) {
      console.error("[v0] Purchase failed:", error)
      setPurchaseError("Purchase failed due to a network error.")
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

  if (!selectedArea || selectedArea.width < 10 || selectedArea.height < 10) {
    return (
      <Button disabled className="w-full bg-gray-400 text-black font-bold py-3 border-2 border-black shadow-lg">
        Select Valid Area (Min 10x10)
      </Button>
    )
  }

  const pixelCount = selectedArea ? selectedArea.width * selectedArea.height : 0
  const creditsNeeded = isAdmin ? Math.ceil(pixelCount * 0.001) : Math.ceil(pixelCount * 0.01)
  const hasEnoughCredits = userCredits >= creditsNeeded
  const isWar = isPurchaseWar()
  const existingOwners = getExistingOwners()

  return (
    <div className="space-y-2">
      {isWar && existingOwners.length > 0 && (
        <div className="bg-orange-100 border-2 border-orange-500 p-2 rounded">
          <p className="text-orange-800 font-bold text-xs text-center">⚔️ PURCHASE WAR! ⚔️</p>
          <p className="text-orange-700 text-xs text-center">
            Taking over blocks from: {existingOwners.map((owner) => owner.slice(0, 8) + "...").join(", ")}
          </p>
        </div>
      )}

      {isAdmin && getExistingBlocks().length > 0 ? (
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
            isWar
              ? "bg-orange-600 hover:bg-orange-700 text-white"
              : isAdmin
                ? "bg-yellow-600 hover:bg-yellow-700 text-black"
                : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          {isPurchasing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : isWar ? (
            "⚔️ TAKEOVER BLOCKS!"
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
          <div>
            Cost: <span className={hasEnoughCredits ? "text-green-600" : "text-red-600"}>{creditsNeeded} Credits</span>
          </div>
          <div className="text-xs text-gray-500">≈ {(creditsNeeded * 10000).toLocaleString()} PIXEL Tokens</div>
          <div className="text-xs text-gray-600 mt-1">Your Balance: {userCredits} Credits</div>
          {isWar && <div className="text-xs text-orange-600 mt-1 font-bold">⚔️ PURCHASE WAR MODE ⚔️</div>}
        </div>
      )}
    </div>
  )
}
