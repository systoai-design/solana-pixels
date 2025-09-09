"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { WalletButton } from "@/components/wallet-button"
import { PurchaseButton } from "@/components/purchase-button"
import { ImageUploadModal } from "@/components/image-upload-modal"
import { CreditsDisplay } from "@/components/credits-display"
import { PaymentVerificationModal } from "@/components/payment-verification-modal"
import { ScrollingMarquee, RetroStats } from "@/components/retro-elements"
import { createBrowserClient } from "@/lib/supabase/client"
import { UsernameModal } from "@/components/username-modal"

interface PixelBlock {
  id?: string
  x: number
  y: number
  width: number
  height: number
  owner?: string
  imageUrl?: string
  url?: string
  transaction_signature?: string
  alt_text?: string
  recentTakeover?: boolean
  takeoverTimestamp?: number
}

const ADMIN_WALLETS = [
  "5zA5RkrFVF9n9eruetEdZFbcbQ2hNJnLrgPx1gc7AFnS",
  "BUbC5ugi4tnscNowHrNfvNsU5SZfMfcnBv7NotvdWyq8",
  "5xarmfJGDSiKV9dLKYksZ6GV4JpfZAGz6FmzShLcqVUz",
  "8AuzH3n5RuGPYVyeh94JgoFGcofUJFLtWm9gwYaV7Euo",
]

export default function PixelCanvas() {
  const { connected, publicKey, signMessage } = useWallet()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedArea, setSelectedArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [totalPixelsSold, setTotalPixelsSold] = useState(0)
  const [recentUpdates, setRecentUpdates] = useState<Array<{ user: string; block: string; time: string }>>([])

  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)

  const [pixelBlocks, setPixelBlocks] = useState<PixelBlock[]>([])
  const [userBlocks, setUserBlocks] = useState<PixelBlock[]>([])
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedBlockForUpload, setSelectedBlockForUpload] = useState<{ block: PixelBlock; index: number } | null>(
    null,
  )

  const [newBlockNotification, setNewBlockNotification] = useState<string | null>(null)
  const [lastNotifiedBlockCount, setLastNotifiedBlockCount] = useState(0)
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set())
  const [lastPurchaseByUser, setLastPurchaseByUser] = useState<string | null>(null)

  const [user, setUser] = useState<any>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [userCredits, setUserCredits] = useState(0)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [usernameModalOpen, setUsernameModalOpen] = useState(false)
  const [currentUsername, setCurrentUsername] = useState("")

  const [isPurchasing, setIsPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [isRetracting, setIsRetracting] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(0)
  const [isSyncPaused, setIsSyncPaused] = useState(false)

  const [hoveredBlock, setHoveredBlock] = useState<PixelBlock | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  const isAdmin = connected && publicKey && ADMIN_WALLETS.includes(publicKey.toString())

  const [recentTakeovers, setRecentTakeovers] = useState<Set<string>>(new Set())

  const canRetractBlock = (block: PixelBlock): boolean => {
    if (!connected || !publicKey) return false

    // Admins can retract any block
    if (isAdmin) {
      console.log(
        `[v0] Admin ${publicKey.toString().slice(0, 8)}... can retract block owned by ${block.owner?.slice(0, 8)}...`,
      )
      return true
    }

    // Regular users can only retract their own blocks
    return block.owner === publicKey.toString()
  }

  const logAdminAction = async (action: string, targetBlock: PixelBlock, targetOwner?: string) => {
    if (!isAdmin || !publicKey) return

    try {
      const supabase = createBrowserClient(
        "https://tomdwpozafthjxgbvoau.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTE2MTksImV4cCI6MjA3MTkyNzYxOX0.vxD10P1s0BCQaBu2GmmrviuyWsS99IP05qnZ7567niM",
      )

      const logEntry = {
        admin_wallet: publicKey.toString(),
        action: action,
        target_block: `${targetBlock.x},${targetBlock.y} (${targetBlock.width}x${targetBlock.height})`,
        target_owner: targetOwner || targetBlock.owner,
        timestamp: new Date().toISOString(),
      }

      console.log(`[v0] Admin Action Log:`, logEntry)

      // Store in recent updates for transparency
      const shortAdmin = publicKey.toString().slice(0, 8) + "..."
      const shortTarget = (targetOwner || targetBlock.owner)?.slice(0, 8) + "..."
      setRecentUpdates((prev) => [
        {
          user: `${shortAdmin} (ADMIN)`,
          block: `${action.toUpperCase()} ${targetBlock.x},${targetBlock.y} from ${shortTarget}`,
          time: "Just now",
        },
        ...prev.slice(0, 4),
      ])
    } catch (error) {
      console.error("[v0] Failed to log admin action:", error)
    }
  }

  useEffect(() => {
    if (connected && publicKey) {
      setUser({ id: publicKey.toString(), wallet_address: publicKey.toString() })
      loadUserCredits(publicKey.toString()).then(setUserCredits)
      loadUserUsername(publicKey.toString()).then(setCurrentUsername)
    } else {
      setUser(null)
      setUserCredits(0)
      setCurrentUsername("")
    }
    setIsAuthLoading(false)
  }, [connected, publicKey])

  const getOrCreateUser = async (walletAddress: string): Promise<string | null> => {
    try {
      const supabase = createBrowserClient(
        "https://tomdwpozafthjxgbvoau.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTE2MTksImV4cCI6MjA3MTkyNzYxOX0.vxD10P1s0BCQaBu2GmmrviuyWsS99IP05qnZ7567niM",
      )

      // Simply return the wallet address as the identifier - no complex user creation needed
      const { data: existingCredits, error: findError } = await supabase
        .from("wallet_credits")
        .select("wallet_address")
        .eq("wallet_address", walletAddress)
        .maybeSingle()

      if (existingCredits && !findError) {
        return walletAddress
      }

      // Create wallet credits entry if it doesn't exist
      const { error: createError } = await supabase.from("wallet_credits").upsert({
        wallet_address: walletAddress,
        credits: 0,
        username: walletAddress.slice(0, 8) + "...",
      })

      if (createError) {
        console.error("[v0] Failed to create wallet credits:", createError)
      }

      return walletAddress
    } catch (error) {
      console.error("[v0] Error in getOrCreateUser:", error)
      return walletAddress
    }
  }

  const savePixelBlockToDatabase = async (block: PixelBlock) => {
    // Server-side purchase API already handles database insertion
    // This function is no longer needed to avoid RLS policy violations
    console.log("[v0] Block save handled by server-side API")
    return true
  }

  const updatePixelBlockInDatabase = async (block: PixelBlock) => {
    try {
      const supabase = createBrowserClient(
        "https://tomdwpozafthjxgbvoau.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTE2MTksImV4cCI6MjA3MTkyNzYxOX0.vxD10P1s0BCQaBu2GmmrviuyWsS99IP05qnZ7567niM",
      )

      console.log("[v0] Updating block in database:", {
        position: `${block.x},${block.y}`,
        size: `${block.width}x${block.height}`,
        hasImage: !!block.imageUrl,
        hasUrl: !!block.url,
        hasAltText: !!block.alt_text,
        owner: block.owner,
      })

      // First, try to find existing block with matching coordinates and owner
      const { data: existingBlocks, error: findError } = await supabase
        .from("pixel_blocks")
        .select("id")
        .eq("start_x", block.x)
        .eq("start_y", block.y)
        .eq("width", block.width)
        .eq("height", block.height)
        .eq("wallet_address", block.owner || "unknown")

      if (findError) {
        console.error("[v0] Error finding existing block:", findError)
        return false
      }

      let result
      if (existingBlocks && existingBlocks.length > 0) {
        // Update existing block
        const { data, error } = await supabase
          .from("pixel_blocks")
          .update({
            image_url: block.imageUrl || null,
            link_url: block.url || null,
            alt_text: block.alt_text || null,
            wallet_address: block.owner || "unknown",
          })
          .eq("id", existingBlocks[0].id)
          .select()

        result = { data, error }
        console.log("[v0] Updated existing block with ID:", existingBlocks[0].id)
      } else {
        // Insert new block
        const { data, error } = await supabase
          .from("pixel_blocks")
          .insert({
            start_x: block.x,
            start_y: block.y,
            width: block.width,
            height: block.height,
            wallet_address: block.owner || "unknown",
            image_url: block.imageUrl || null,
            link_url: block.url || null,
            alt_text: block.alt_text || null,
            total_price: 1, // Default price for uploaded content
          })
          .select()

        result = { data, error }
        console.log("[v0] Inserted new block")
      }

      if (result.error) {
        console.error("[v0] Failed to save block:", result.error)
        return false
      }

      console.log("[v0] Successfully saved block to database:", result.data?.[0])
      console.log("[v0] Upload details saved - visible to all users server-wide")
      return true
    } catch (error) {
      console.error("[v0] Database save error:", error)
      return false
    }
  }

  const loadPixelBlocksFromDatabase = async (): Promise<PixelBlock[]> => {
    try {
      const supabase = createBrowserClient(
        "https://tomdwpozafthjxgbvoau.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM1MTYxOSwiZXhwIjoyMDcxOTI3NjE5fQ.tECXG3JrQaFv2oDtneielFI5uoHQ4jABB7IlqKuk2CU",
      )

      const { data, error } = await supabase.from("pixel_blocks").select("*")

      if (error) {
        console.error("[v0] Database load error:", error)
        return []
      }

      const blocks: PixelBlock[] = (data || []).map((block) => ({
        id: block.id,
        x: block.start_x,
        y: block.start_y,
        width: block.width,
        height: block.height,
        owner: block.wallet_address || undefined, // Use wallet_address for ownership display
        imageUrl: block.image_url || undefined,
        url: block.link_url || undefined,
        color: block.image_url ? undefined : "#" + Math.floor(Math.random() * 16777215).toString(16),
        transaction_signature: block.transaction_signature || undefined,
        alt_text: block.alt_text || undefined,
      }))

      console.log("[v0] Successfully loaded", blocks.length, "blocks from database")
      return blocks
    } catch (error) {
      console.error("[v0] Database load error:", error)
      return []
    }
  }

  const deletePixelBlockFromDatabase = async (block: PixelBlock) => {
    try {
      const supabase = createBrowserClient(
        "https://tomdwpozafthjxgbvoau.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM1MTYxOSwiZXhwIjoyMDcxOTI3NjE5fQ.tECXG3JrQaFv2oDtneielFI5uoHQ4jABB7IlqKuk2CU",
      )

      // First verify the block exists
      const { data: existingBlock, error: checkError } = await supabase
        .from("pixel_blocks")
        .select("id")
        .eq("id", block.id)
        .single()

      if (checkError || !existingBlock) {
        console.log("[v0] Block already deleted or doesn't exist:", block.id)
        return true
      }

      // Perform the deletion
      const { error: deleteError } = await supabase.from("pixel_blocks").delete().eq("id", block.id)

      if (deleteError) {
        console.error("[v0] Failed to delete block from database:", deleteError)
        return false
      }

      // Verify deletion was successful
      const { data: verifyBlock, error: verifyError } = await supabase
        .from("pixel_blocks")
        .select("id")
        .eq("id", block.id)
        .single()

      if (verifyError && verifyError.code === "PGRST116") {
        // Block not found - deletion successful
        console.log("[v0] Successfully deleted and verified block removal from database")
        return true
      } else if (verifyBlock) {
        console.error("[v0] Block still exists after deletion attempt:", block.id)
        return false
      }

      console.log("[v0] Successfully deleted block from database")
      return true
    } catch (error) {
      console.error("[v0] Error deleting block from database:", error)
      return false
    }
  }

  const syncPixelBlocks = useCallback(async () => {
    if (isSyncing || Date.now() - lastSyncTime < 2000 || isUploadingImage || isSyncPaused) {
      return
    }

    setIsSyncing(true)
    try {
      const databaseBlocks = await loadPixelBlocksFromDatabase()

      if (databaseBlocks.length !== pixelBlocks.length) {
        console.log("[v0] Syncing pixel blocks from database:", databaseBlocks.length, "blocks")

        setPixelBlocks((prev) => {
          const merged = [...databaseBlocks]

          prev.forEach((localBlock) => {
            const dbIndex = merged.findIndex(
              (dbBlock) =>
                dbBlock.x === localBlock.x && dbBlock.y === localBlock.y && dbBlock.owner === localBlock.owner,
            )

            if (dbIndex !== -1) {
              const dbBlock = merged[dbIndex]
              if (localBlock.imageUrl && !dbBlock.imageUrl) {
                merged[dbIndex] = { ...dbBlock, ...localBlock }
              }
            }
          })

          return merged
        })

        const totalPixels = databaseBlocks.reduce((total, block) => total + block.width * block.height, 0)
        setTotalPixelsSold(totalPixels)

        if (databaseBlocks.length > lastNotifiedBlockCount && lastNotifiedBlockCount > 0) {
          const newBlocks = databaseBlocks.slice(lastNotifiedBlockCount)
          const otherUserBlocks = newBlocks.filter(
            (block) =>
              block.owner !== publicKey?.toString() && !shownNotifications.has(`${block.x}-${block.y}-${block.owner}`),
          )

          if (otherUserBlocks.length > 0) {
            const blockIds = otherUserBlocks
              .map((block) => `${block.x}-${block.y}-${block.owner}`)
              .sort()
              .join(",")
            const notificationKey = `blocks-${blockIds}`

            if (!shownNotifications.has(notificationKey)) {
              setNewBlockNotification(
                `${otherUserBlocks.length} new pixel block${otherUserBlocks.length > 1 ? "s" : ""} purchased!`,
              )
              setShownNotifications(
                (prev) =>
                  new Set([
                    ...prev,
                    notificationKey,
                    ...otherUserBlocks.map((block) => `${block.x}-${block.y}-${block.owner}`),
                  ]),
              )
              setTimeout(() => {
                setNewBlockNotification(null)
              }, 3000)
            }
          }
        }

        setLastNotifiedBlockCount(databaseBlocks.length)

        if (databaseBlocks.length > 0) {
          const latestBlock = databaseBlocks[databaseBlocks.length - 1]
          const shortAddress = latestBlock.owner?.slice(0, 8) + "..." || "Unknown"
          setRecentUpdates((prev) => {
            const newUpdate = {
              user: shortAddress,
              block: `${latestBlock.x},${latestBlock.y}`,
              time: "Just now",
            }
            if (prev.length === 0 || prev[0].block !== newUpdate.block) {
              return [newUpdate, ...prev.slice(0, 4)]
            }
            return prev
          })
        }
      }
    } catch (error) {
      console.error("[v0] Sync error:", error)
    } finally {
      setIsSyncing(false)
    }
  }, [
    isSyncing,
    lastSyncTime,
    pixelBlocks.length,
    publicKey,
    lastNotifiedBlockCount,
    shownNotifications,
    isUploadingImage,
    isSyncPaused,
  ])

  useEffect(() => {
    const initializeCanvas = async () => {
      const initialBlocks = await loadPixelBlocksFromDatabase()
      setPixelBlocks(initialBlocks)
      setLastNotifiedBlockCount(initialBlocks.length)
      const totalPixels = initialBlocks.reduce((total, block) => total + block.width * block.height, 0)
      setTotalPixelsSold(totalPixels)
      console.log("[v0] Initialized with", initialBlocks.length, "blocks from database")
    }

    initializeCanvas()

    const syncInterval = setInterval(syncPixelBlocks, 5000)

    return () => {
      clearInterval(syncInterval)
    }
  }, [])

  const handlePurchaseSuccess = useCallback(
    async (newBlock: {
      x: number
      y: number
      width: number
      height: number
      owner: string
      color: string
      transaction_signature?: string
    }) => {
      console.log("[v0] Processing purchase success for:", newBlock.owner, "at", newBlock.x, newBlock.y)

      if (!connected || !publicKey) {
        console.error("[v0] Wallet not connected - cannot process purchase")
        return
      }

      setLastPurchaseByUser(`${newBlock.x}-${newBlock.y}-${newBlock.owner}`)

      const saveSuccess = await savePixelBlockToDatabase(newBlock)

      if (saveSuccess) {
        console.log("[v0] Purchase successfully saved to database")
        const updatedBlocks = [...pixelBlocks, newBlock]
        setPixelBlocks(updatedBlocks)
        setTotalPixelsSold((prev) => prev + newBlock.width * newBlock.height)

        setLastNotifiedBlockCount(updatedBlocks.length)
        setShownNotifications((prev) => new Set([...prev, `${newBlock.x}-${newBlock.y}-${newBlock.owner}`]))

        setTimeout(() => {
          syncPixelBlocks()
        }, 500)
      } else {
        console.error("[v0] Failed to save purchase to database - not updating local state")
        return
      }

      setSelectedArea(null)

      const shortAddress = newBlock.owner?.slice(0, 8) + "..." || "Unknown"
      setRecentUpdates((prev) => [
        {
          user: shortAddress,
          block: `${newBlock.x},${newBlock.y}`,
          time: "Just now",
        },
        ...prev.slice(0, 4),
      ])

      const existingBlocks = pixelBlocks.filter(
        (block) =>
          block.x < newBlock.x + newBlock.width &&
          block.x + block.width > newBlock.x &&
          block.y < newBlock.y + newBlock.height &&
          block.y + block.height > newBlock.y &&
          block.owner !== newBlock.owner,
      )

      const wasTakeover = existingBlocks.length > 0

      if (wasTakeover) {
        const blockKey = `${newBlock.x}-${newBlock.y}-${newBlock.width}-${newBlock.height}`
        setRecentTakeovers((prev) => new Set(prev).add(blockKey))

        setTimeout(() => {
          setRecentTakeovers((prev) => {
            const newSet = new Set(prev)
            newSet.delete(blockKey)
            return newSet
          })
        }, 5000)

        console.log("[v0] Purchase war successful! Block taken over from other users")
      }
    },
    [pixelBlocks, connected, publicKey, setRecentUpdates],
  )

  const handleImageUpload = async (blockIndex: number, imageUrl: string, url?: string, message?: string) => {
    console.log("[v0] Starting image upload process:", {
      blockIndex,
      hasImageUrl: !!imageUrl,
      hasUrl: !!url,
      hasMessage: !!message,
      userBlocksLength: userBlocks.length,
      totalPixelBlocks: pixelBlocks.length,
    })

    const blockToUpdate = userBlocks[blockIndex]
    if (!blockToUpdate) {
      console.error("[v0] Block not found at index:", blockIndex, "Available blocks:", userBlocks.length)
      return
    }

    console.log("[v0] Found block to update:", {
      position: `${blockToUpdate.x},${blockToUpdate.y}`,
      size: `${blockToUpdate.width}x${blockToUpdate.height}`,
      owner: blockToUpdate.owner,
    })

    setIsUploadingImage(true)

    const updatedBlock = {
      ...blockToUpdate,
      imageUrl,
      url: url || blockToUpdate.url,
      alt_text: message || blockToUpdate.alt_text,
    }

    console.log("[v0] Prepared block for database update:", {
      hasImageUrl: !!updatedBlock.imageUrl,
      hasUrl: !!updatedBlock.url,
      hasAltText: !!updatedBlock.alt_text,
      owner: updatedBlock.owner,
    })

    setPixelBlocks((prev) => {
      const updated = [...prev]
      const globalIndex = prev.findIndex(
        (block) => block.x === blockToUpdate.x && block.y === blockToUpdate.y && block.owner === blockToUpdate.owner,
      )

      if (globalIndex !== -1) {
        updated[globalIndex] = updatedBlock
        console.log("[v0] Updated local state for block at global index:", globalIndex)
      } else {
        console.error("[v0] Could not find block in global pixelBlocks array")
      }
      return updated
    })

    setIsSyncPaused(true)

    try {
      console.log("[v0] Checking wallet connection...")
      if (!signMessage || !publicKey) {
        throw new Error("Wallet not connected or signMessage not available")
      }
      console.log("[v0] Wallet connected, preparing signature...")

      const messageToSign = `Update block at ${updatedBlock.x},${updatedBlock.y} with image ${updatedBlock.imageUrl}`
      console.log("[v0] Message to sign:", messageToSign)

      const encodedMessage = new TextEncoder().encode(messageToSign)
      console.log("[v0] Requesting signature from wallet...")

      const signedMessage = await signMessage(encodedMessage)
      const signature = Buffer.from(signedMessage).toString("base64")
      console.log("[v0] Signature obtained, calling API...")

      const requestBody = {
        publicKey: publicKey.toString(),
        updatedBlock,
        signature,
        messageToSign,
      }
      console.log("[v0] API request body prepared:", {
        publicKey: requestBody.publicKey,
        blockPosition: `${requestBody.updatedBlock.x},${requestBody.updatedBlock.y}`,
        hasSignature: !!requestBody.signature,
      })

      const response = await fetch("/api/update-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      console.log("[v0] API response status:", response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] API error response:", errorText)
        throw new Error(`Update failed: ${response.statusText} - ${errorText}`)
      }

      const responseData = await response.json()
      console.log("[v0] API response data:", responseData)
      console.log("[v0] Successfully updated block via API - changes saved to database")

      setTimeout(() => {
        console.log("[v0] Resuming sync after successful upload...")
        setIsSyncPaused(false)
        syncPixelBlocks()
      }, 1000)
    } catch (error) {
      console.error("[v0] Failed to update block:", error)
      console.log("[v0] Upload failed - resuming sync...")
      setIsSyncPaused(false)
    } finally {
      setIsUploadingImage(false)
      setUploadModalOpen(false)
      setSelectedBlockForUpload(null)
    }

    console.log("[v0] Upload details saved:", {
      imageUrl: imageUrl ? "✅ Image saved" : "❌ No image",
      linkUrl: url ? `✅ Link: ${url}` : "❌ No link",
      altText: message ? `✅ Message: ${message}` : "❌ No message",
    })
    console.log("[v0] Image upload process completed")
  }

  const handleRetractPixels = async (area: { x: number; y: number; width: number; height: number }) => {
    if (!isAdmin) return

    setIsRetracting(true)
    try {
      console.log(`[v0] Admin retracting pixels in area:`, area)

      const blocksToRemove = pixelBlocks.filter((block) => {
        return (
          block.x < area.x + area.width &&
          block.x + block.width > area.x &&
          block.y < area.y + area.height &&
          block.y + block.height > area.y
        )
      })

      const otherUsersBlocks = blocksToRemove.filter((block) => block.owner !== publicKey?.toString())

      if (otherUsersBlocks.length > 0) {
        const owners = [...new Set(otherUsersBlocks.map((block) => block.owner?.slice(0, 8) + "..."))]
        const confirmMessage = `⚠️ ADMIN ACTION: You are about to retract ${otherUsersBlocks.length} blocks owned by other users: ${owners.join(", ")}. This action cannot be undone. Continue?`

        if (!confirm(confirmMessage)) {
          console.log("[v0] Admin cancelled retraction of other users' blocks")
          setIsRetracting(false)
          return
        }

        console.log(`[v0] Admin confirmed retraction of ${otherUsersBlocks.length} blocks from other users`)
      }

      const totalPixelsToRefund = blocksToRemove.reduce((total, block) => total + block.width * block.height, 0)
      const refundAmount = isAdmin ? Math.ceil(totalPixelsToRefund * 0.1) : totalPixelsToRefund * 1

      let allDeleted = true
      for (const block of blocksToRemove) {
        if (block.owner !== publicKey?.toString()) {
          await logAdminAction("RETRACT_AREA", block, block.owner)
        }

        const deleteSuccess = await deletePixelBlockFromDatabase(block)
        if (!deleteSuccess) {
          allDeleted = false
        }
      }

      if (allDeleted && totalPixelsToRefund > 0) {
        try {
          const supabase = createBrowserClient(
            "https://tomdwpozafthjxgbvoau.supabase.co",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM1MTYxOSwiZXhwIjoyMDcxOTI3NjE5fQ.tECXG3JrQaFv2oDtneielFI5uoHQ4jABB7IlqKuk2CU",
          )

          const { data: currentWallet, error: fetchError } = await supabase
            .from("wallet_credits")
            .select("credits")
            .eq("wallet_address", publicKey?.toString())
            .maybeSingle()

          const currentCredits = currentWallet?.credits || 0
          const newCreditsBalance = currentCredits + refundAmount

          const { error: updateError } = await supabase.from("wallet_credits").upsert({
            wallet_address: publicKey?.toString(),
            credits: newCreditsBalance,
            username: publicKey?.toString().slice(0, 8) + "...",
          })

          if (!updateError) {
            console.log(
              `[v0] Refunded ${refundAmount} credits for ${totalPixelsToRefund} pixels. New balance: ${newCreditsBalance}`,
            )
            setUserCredits(newCreditsBalance)
          } else {
            console.error("[v0] Failed to refund credits:", updateError)
          }
        } catch (error) {
          console.error("[v0] Error processing credit refund:", error)
        }

        setPixelBlocks((prev) => {
          return prev.filter((block) => {
            return !(
              block.x < area.x + area.width &&
              block.x + block.width > area.x &&
              block.y < area.y + area.height &&
              block.y + block.height > area.y
            )
          })
        })

        const removedPixels = blocksToRemove.reduce((total, block) => total + block.width * block.height, 0)
        setTotalPixelsSold((prev) => Math.max(0, prev - removedPixels))
      } else {
        console.error("[v0] Failed to delete some blocks from database")
      }

      setSelectedArea(null)

      const shortAddress = publicKey?.toString().slice(0, 8) + "..." || "Admin"
      setRecentUpdates((prev) => [
        {
          user: shortAddress,
          block: `${area.x},${area.y}`,
          time: "Just now (RETRACTED)",
        },
        ...prev.slice(0, 4),
      ])
    } finally {
      setIsRetracting(false)
    }
  }

  const handleRetractIndividualBlock = async (blockToRemove: any) => {
    if (!isAdmin) return

    try {
      console.log(`[v0] Admin retracting individual block:`, blockToRemove)

      const isOtherUsersBlock = blockToRemove.owner !== publicKey?.toString()

      if (isOtherUsersBlock) {
        const ownerDisplay = blockToRemove.owner?.slice(0, 8) + "..."
        const confirmMessage = `⚠️ ADMIN ACTION: You are about to retract a block owned by ${ownerDisplay}. This action cannot be undone. Continue?`

        if (!confirm(confirmMessage)) {
          console.log("[v0] Admin cancelled retraction of other user's block")
          return
        }

        console.log(`[v0] Admin confirmed retraction of block from ${ownerDisplay}`)
        await logAdminAction("RETRACT_INDIVIDUAL", blockToRemove, blockToRemove.owner)
      }

      const pixelsToRefund = blockToRemove.width * blockToRemove.height
      const refundAmount = isAdmin ? Math.ceil(pixelsToRefund * 0.1) : pixelsToRefund * 1

      const deleteSuccess = await deletePixelBlockFromDatabase(blockToRemove)

      if (deleteSuccess) {
        try {
          const supabase = createBrowserClient(
            "https://tomdwpozafthjxgbvoau.supabase.co",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM1MTYxOSwiZXhwIjoyMDcxOTI3NjE5fQ.tECXG3JrQaFv2oDtneielFI5uoHQ4jABB7IlqKuk2CU",
          )

          const { data: currentWallet, error: fetchError } = await supabase
            .from("wallet_credits")
            .select("credits")
            .eq("wallet_address", publicKey?.toString())
            .maybeSingle()

          const currentCredits = currentWallet?.credits || 0
          const newCreditsBalance = currentCredits + refundAmount

          const { error: updateError } = await supabase.from("wallet_credits").upsert({
            wallet_address: publicKey?.toString(),
            credits: newCreditsBalance,
            username: publicKey?.toString().slice(0, 8) + "...",
          })

          if (!updateError) {
            console.log(`[v0] Refunded ${refundAmount} credits for individual block. New balance: ${newCreditsBalance}`)
            setUserCredits(newCreditsBalance)
          } else {
            console.error("[v0] Failed to refund credits:", updateError)
          }
        } catch (error) {
          console.error("[v0] Error processing credit refund:", error)
        }

        setPixelBlocks((prev) => {
          return prev.filter(
            (block) =>
              !(
                block.x === blockToRemove.x &&
                block.y === blockToRemove.y &&
                block.width === blockToRemove.width &&
                block.height === blockToRemove.height &&
                block.owner === blockToRemove.owner
              ),
          )
        })

        setTotalPixelsSold((prev) => Math.max(0, prev - blockToRemove.width * blockToRemove.height))
      } else {
        console.error("[v0] Failed to delete block from database")
      }

      const shortAddress = publicKey?.toString().slice(0, 8) + "..." || "Admin"
      setRecentUpdates((prev) => [
        {
          user: shortAddress,
          block: `${blockToRemove.x},${blockToRemove.y}`,
          time: "Just now (RETRACTED)",
        },
        ...prev.slice(0, 4),
      ])
    } finally {
      setIsRetracting(false)
    }
  }

  const openUploadModal = (block: PixelBlock, index: number) => {
    setSelectedBlockForUpload({ block, index })
    setUploadModalOpen(true)
  }

  useEffect(() => {
    if (connected && publicKey) {
      const ownedBlocks = pixelBlocks.filter((block) => block.owner === publicKey.toString())
      setUserBlocks(ownedBlocks)
    } else {
      setUserBlocks([])
    }
  }, [connected, publicKey, pixelBlocks])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    drawGrid(ctx, canvas)

    pixelBlocks.forEach((block) => {
      const isOwnedByCurrentUser = connected && publicKey && block.owner === publicKey.toString()
      const isRecentTakeover = recentTakeovers.has(`${block.x}-${block.y}-${block.width}-${block.height}`)

      if (block.imageUrl) {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          ctx.drawImage(img, block.x, block.y, block.width, block.height)

          if (isOwnedByCurrentUser) {
            ctx.strokeStyle = "#22c55e"
            ctx.lineWidth = 2
            ctx.strokeRect(block.x, block.y, block.width, block.height)
          }

          if (isRecentTakeover) {
            ctx.strokeStyle = "#dc2626"
            ctx.lineWidth = 4
            ctx.strokeRect(block.x - 2, block.y - 2, block.width + 4, block.height + 4)

            ctx.fillStyle = "rgba(220, 38, 38, 0.9)"
            ctx.fillRect(block.x, block.y - 20, Math.min(block.width, 80), 18)

            ctx.fillStyle = "#ffffff"
            ctx.font = "bold 12px monospace"
            ctx.textAlign = "center"
            ctx.fillText("⚔️ WAR WON!", block.x + Math.min(block.width, 80) / 2, block.y - 6)
            ctx.textAlign = "left"
          }
        }
        img.src = block.imageUrl
      } else {
        ctx.fillStyle = isOwnedByCurrentUser ? "#dcfce7" : "#dbeafe"
        ctx.fillRect(block.x, block.y, block.width, block.height)

        ctx.strokeStyle = isOwnedByCurrentUser ? "#22c55e" : "#3b82f6"
        ctx.lineWidth = 3
        ctx.strokeRect(block.x, block.y, block.width, block.height)

        if (isRecentTakeover) {
          ctx.strokeStyle = "#dc2626"
          ctx.lineWidth = 4
          ctx.strokeRect(block.x - 2, block.y - 2, block.width + 4, block.height + 4)

          ctx.fillStyle = "rgba(220, 38, 38, 0.9)"
          ctx.fillRect(block.x, block.y - 20, Math.min(block.width, 80), 18)

          ctx.fillStyle = "#ffffff"
          ctx.font = "bold 12px monospace"
          ctx.textAlign = "center"
          ctx.fillText("⚔️ WAR WON!", block.x + Math.min(block.width, 80) / 2, block.y - 6)
          ctx.textAlign = "left"
        }

        if (isOwnedByCurrentUser) {
          ctx.fillStyle = "#16a34a"
          ctx.font = "10px monospace"
          ctx.textAlign = "center"
          const centerX = block.x + block.width / 2
          const centerY = block.y + block.height / 2
          ctx.fillText("UPLOAD", centerX, centerY - 5)
          ctx.fillText("IMAGE", centerX, centerY + 8)
          ctx.textAlign = "left"
        } else {
          loadBlockOwnerUsername(block.owner || "").then((username) => {
            ctx.fillStyle = "#2563eb"
            ctx.font = "10px monospace"
            ctx.textAlign = "center"
            const centerX = block.x + block.width / 2
            const centerY = block.y + block.height / 2
            ctx.fillText(`Owned by`, centerX, centerY - 5)
            ctx.fillText(username, centerX, centerY + 8)
            ctx.textAlign = "left"
          })
        }
      }
    })

    if (selectedArea) {
      ctx.strokeStyle = "#ef4444"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(selectedArea.x, selectedArea.y, selectedArea.width, selectedArea.height)

      ctx.fillStyle = "rgba(239, 68, 68, 0.1)"
      ctx.fillRect(selectedArea.x, selectedArea.y, selectedArea.width, selectedArea.height)
      ctx.setLineDash([])
    }
  }, [pixelBlocks, selectedArea, connected, publicKey, recentTakeovers])

  const drawGrid = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.strokeStyle = "#e0e0e0"
    ctx.lineWidth = 0.5
    const gridSize = 1

    for (let i = 0; i <= canvas.width; i += 10) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, canvas.height)
      ctx.stroke()
    }

    for (let i = 0; i <= canvas.height; i += 10) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(canvas.width, i)
      ctx.stroke()
    }
  }

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    return { x: Math.floor(x), y: Math.floor(y) }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e)

    if (e.button === 0) {
      setIsSelecting(true)
      setSelectionStart(coords)
      setSelectedArea(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSelecting && selectionStart) {
      const coords = getCanvasCoordinates(e)
      const x = Math.min(selectionStart.x, coords.x)
      const y = Math.min(selectionStart.y, coords.y)
      const width = Math.abs(coords.x - selectionStart.x)
      const height = Math.abs(coords.y - selectionStart.y)

      const snappedWidth = Math.max(10, Math.round(width / 10) * 10)
      const snappedHeight = Math.max(10, Math.round(height / 10) * 10)
      const snappedX = Math.round(x / 10) * 10
      const snappedY = Math.round(y / 10) * 10

      setSelectedArea({
        x: snappedX,
        y: snappedY,
        width: snappedWidth,
        height: snappedHeight,
      })
    } else {
      const coords = getCanvasCoordinates(e)
      const hoveredBlock = pixelBlocks.find(
        (block) =>
          coords.x >= block.x &&
          coords.x < block.x + block.width &&
          coords.y >= block.y &&
          coords.y < block.y + block.height &&
          block.imageUrl &&
          block.alt_text,
      )

      if (hoveredBlock) {
        setHoveredBlock(hoveredBlock)
        setTooltipPosition({ x: e.clientX, y: e.clientY })
      } else {
        setHoveredBlock(null)
        setTooltipPosition(null)
      }
    }
  }

  const handleMouseUp = () => {
    setIsSelecting(false)
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSelecting) return

    const coords = getCanvasCoordinates(e)

    const clickedBlock = pixelBlocks.find(
      (block) =>
        coords.x >= block.x &&
        coords.x < block.x + block.width &&
        coords.y >= block.y &&
        coords.y < block.y + block.height,
    )

    if (clickedBlock) {
      if (clickedBlock.url) {
        let finalUrl = clickedBlock.url.trim()

        if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
          finalUrl = "https://" + finalUrl
        }

        try {
          window.open(finalUrl, "_blank", "noopener,noreferrer")
          console.log("[v0] Block website opened:", finalUrl)
        } catch (error) {
          console.error("[v0] Failed to open block website:", error)
        }
      } else if (clickedBlock.imageUrl) {
        console.log("[v0] Block clicked but no website URL set")
      } else {
        const isOwnedByCurrentUser = connected && publicKey && clickedBlock.owner === publicKey.toString()
        if (isOwnedByCurrentUser) {
          const blockIndex = userBlocks.findIndex((b) => b.id === clickedBlock.id)
          if (blockIndex !== -1) {
            setSelectedBlockForUpload({ block: clickedBlock, index: blockIndex })
            setUploadModalOpen(true)
          } else {
            console.error("[v0] Block not found in user's owned blocks")
          }
        }
      }
    }
  }

  const handleMouseLeave = () => {
    setHoveredBlock(null)
    setTooltipPosition(null)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = 1000
    canvas.height = 1100

    drawCanvas()
  }, [drawCanvas])

  const hasOverlap = (area: { x: number; y: number; width: number; height: number }) => {
    return pixelBlocks.some(
      (block) =>
        !(
          area.x >= block.x + block.width ||
          area.x + area.width <= block.x ||
          area.y >= block.y + block.height ||
          area.y + area.height <= block.y
        ),
    )
  }

  const isValidSelection =
    selectedArea && selectedArea.width >= 10 && selectedArea.height >= 10 && !hasOverlap(selectedArea)

  const retroStats = [
    { label: "PIXELS SOLD", value: totalPixelsSold.toLocaleString(), color: "text-red-600" },
    { label: "PIXELS LEFT", value: (1000000 - totalPixelsSold).toLocaleString(), color: "text-green-600" },
  ]

  const loadUserCredits = async (walletAddress: string) => {
    try {
      const supabase = createBrowserClient(
        "https://tomdwpozafthjxgbvoau.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTE2MTksImV4cCI6MjA3MTkyNzYxOX0.vxD10P1s0BCQaBu2GmmrviuyWsS99IP05qnZ7567niM",
      )

      const { data, error } = await supabase
        .from("wallet_credits")
        .select("credits")
        .eq("wallet_address", walletAddress)
        .maybeSingle()

      if (error) {
        console.error("[v0] Failed to load user credits:", error)
        return 0
      }

      return data?.credits || 0
    } catch (error) {
      console.error("[v0] Error loading credits:", error)
      return 0
    }
  }

  const loadUserUsername = async (walletAddress: string) => {
    try {
      const supabase = createBrowserClient(
        "https://tomdwpozafthjxgbvoau.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTE2MTksImV4cCI6MjA3MTkyNzYxOX0.vxD10P1s0BCQaBu2GmmrviuyWsS99IP05qnZ7567niM",
      )

      const { data, error } = await supabase
        .from("wallet_credits")
        .select("username")
        .eq("wallet_address", walletAddress)
        .maybeSingle()

      if (error) {
        return walletAddress.slice(0, 8) + "..."
      }

      return data?.username || walletAddress.slice(0, 8) + "..."
    } catch (error) {
      return walletAddress.slice(0, 8) + "..."
    }
  }

  const loadBlockOwnerUsername = async (ownerWallet: string) => {
    try {
      const supabase = createBrowserClient(
        "https://tomdwpozafthjxgbvoau.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTE2MTksImV4cCI6MjA3MTkyNzYxOX0.vxD10P1s0BCQaBu2GmmrviuyWsS99IP05qnZ7567niM",
      )

      const { data, error } = await supabase
        .from("wallet_credits")
        .select("username")
        .eq("wallet_address", ownerWallet)
        .maybeSingle()

      if (error) {
        return ownerWallet.slice(0, 8) + "..."
      }

      return data?.username || ownerWallet.slice(0, 8) + "..."
    } catch (error) {
      return ownerWallet.slice(0, 8) + "..."
    }
  }

  const creditsToPixel = (credits: number) => {
    return credits * 10000 // 1 credit = 10,000 PIXEL tokens
  }

  const handlePaymentVerified = async (newCredits: number) => {
    try {
      const updatedCredits = await loadUserCredits(publicKey?.toString() || "")
      setUserCredits(updatedCredits)

      console.log(`[v0] Payment verified: Added ${newCredits} credits. New total: ${updatedCredits}`)
    } catch (error) {
      console.error("[v0] Error updating credits after payment:", error)
      setUserCredits((prev) => prev + newCredits)
    }
    setPaymentModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {newBlockNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-400 text-black px-6 py-3 border-4 border-black shadow-lg">
          <p className="font-bold comic-font text-center">🔥 {newBlockNotification} 🔥</p>
        </div>
      )}

      {!connected && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 border-4 border-black shadow-lg">
          <p className="font-bold text-sm">CONNECT WALLET TO PURCHASE PIXELS</p>
        </div>
      )}

      <div className="text-center mb-8">
        <div className="mb-6">
          <img
            src="/sol-pixel-banner.png"
            alt="Sol Pixel - 1M Pixel Digital Advertising Canvas on Solana Blockchain"
            className="mx-auto max-w-full h-auto border-4 border-black shadow-lg"
            style={{ maxHeight: "200px" }}
          />
        </div>

        <div className="mt-4 mb-6">
          <a
            href="https://x.com/solmillionpixel"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 hover:bg-gray-800 text-white font-bold py-3 px-6 border-4 border-white shadow-lg transition-all duration-200 hover:scale-105 cyber-font bg-red-600"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            FOLLOW @SOLMILLIONPIXEL
          </a>

          <a
            href="https://pump.fun/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 hover:bg-green-700 text-white font-bold py-3 px-6 border-4 border-white shadow-lg transition-all duration-200 hover:scale-105 cyber-font bg-green-600 ml-4"
          >
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Pump_fun_logo-2Ab7Vc0aD6cc2yr563BOEkrBQv6z1j.png"
              alt="Pump.fun"
              className="w-6 h-6"
            />
            $PIXEL
          </a>
        </div>
      </div>

      <ScrollingMarquee>
        🚨 PIXEL WARS ACTIVE! 🚨 UPLOAD IMAGES & LINKS! 🚨 HOVER MESSAGES! 🚨 REAL-TIME VISITORS! 🚨 BLOCKCHAIN SECURED!
        🚨
      </ScrollingMarquee>

      <div className="mb-6">
        <RetroStats stats={retroStats} />
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
        <div className="xl:col-span-3 order-2 xl:order-1">
          <Card className="p-2 md:p-4 bg-white border-4 border-black">
            <div className="bg-blue-600 p-2 mb-4">
              <h2 className="text-white cyber-font text-lg md:text-xl text-center font-bold">
                &gt; THE PIXEL CANVAS &lt;
              </h2>
            </div>

            <div
              ref={containerRef}
              className="relative overflow-auto border-4 border-black bg-white"
              style={{ height: "1100px", maxHeight: "1100px" }}
            >
              <canvas
                ref={canvasRef}
                className="border border-gray-300 cursor-pointer bg-pink-50"
                style={{ height: "1100px", maxHeight: "1100px" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onClick={handleCanvasClick}
                onContextMenu={(e) => e.preventDefault()}
                onMouseLeave={handleMouseLeave}
              />
            </div>

            <div className="bg-gray-200 text-center py-2 border-t-4 border-black">
              <p className="font-bold text-black">CLICK AND DRAG TO SELECT PIXELS</p>
            </div>
          </Card>
        </div>

        <div className="order-1 xl:order-2 space-y-4">
          <Card className="p-3 md:p-4 bg-white border-4 border-black">
            <div className="bg-green-600 p-2 mb-3">
              <h3 className="text-white cyber-font text-sm md:text-base text-center font-bold">PIXEL STATS</h3>
            </div>
            <div className="space-y-3">
              {retroStats.map((stat, i) => (
                <div key={i} className="text-center p-2 border-2 border-gray-300 bg-gray-50">
                  <div className={`text-lg md:text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs md:text-sm font-bold mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 bg-white border-4 border-black">
            <h3 className="font-bold text-xl mb-4 text-center comic-font text-black">🔗 CONNECT WALLET</h3>
            <div className="space-y-3">
              <WalletButton />
              {connected && (
                <div className="space-y-2">
                  <div className="bg-gray-50 p-2 border-2 border-gray-300 rounded">
                    <p className="text-xs font-bold text-gray-600 mb-1">USERNAME:</p>
                    <Button
                      onClick={() => setUsernameModalOpen(true)}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start bg-purple-100 hover:bg-purple-200 border-purple-300"
                    >
                      👤 {currentUsername || "Set Username"}
                    </Button>
                  </div>
                  <CreditsDisplay credits={userCredits} onTopUp={() => setPaymentModalOpen(true)} />
                </div>
              )}
            </div>
            {isAdmin && (
              <div className="bg-yellow-100 border-2 border-yellow-500 p-3 rounded-lg mb-4">
                <h3 className="font-bold text-yellow-800 text-sm mb-2">👑 ADMIN PRIVILEGES ACTIVE</h3>
                <div className="text-xs text-yellow-700 space-y-1">
                  <p>• Can retract ANY user's blocks</p>
                  <p>• All actions are logged and visible</p>
                  <p>• Confirmation required for other users' blocks</p>
                  <p>• 99% discount on purchases (0.001 credits/pixel)</p>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-4 bg-white border-4 border-black">
            <h3 className="font-bold text-xl mb-4 text-center comic-font text-black">💸 BUY PIXELS</h3>
            <div className="space-y-3">
              
              
              {isAdmin && (
                <div className="bg-yellow-200 p-3 border-2 border-black">
                  <p className="font-bold comic-font text-black text-lg">ADMIN: 0.001 CREDITS/PIXEL!</p>
                  <p className="text-sm text-black">≈ 10 PIXEL TOKENS/PIXEL</p>
                </div>
              )}
              {!isAdmin && (
                <div className="bg-red-200 p-3 border-2 border-black">
                  <p className="font-bold comic-font text-black text-lg">0.2 CREDITS/PIXEL</p>
                  <p className="text-sm text-black">≈ 2,000 PIXEL TOKENS/PIXEL</p>
                </div>
              )}
              {connected ? (
                <PurchaseButton
                  selectedArea={selectedArea}
                  isValidSelection={isValidSelection}
                  onPurchaseSuccess={handlePurchaseSuccess}
                  isAdmin={isAdmin}
                  pixelBlocks={pixelBlocks}
                  onRetractPixels={handleRetractPixels}
                  userCredits={userCredits}
                  onCreditsUpdate={setUserCredits}
                />
              ) : (
                <div className="p-3 bg-red-100 border-2 border-red-500 text-center">
                  <p className="text-red-700 font-bold text-sm">CONNECT WALLET TO PURCHASE PIXELS</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 bg-white border-4 border-black">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl comic-font">📺 RECENT UPDATES</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full blink"></div>
                <span className="text-xs cyber-font">REAL-TIME</span>
              </div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentUpdates.length > 0 ? (
                recentUpdates.map((update, i) => (
                  <div
                    key={i}
                    className={`bg-gray-100 p-2 border border-black text-xs ${i === 0 ? "border-green-500 border-2" : ""}`}
                  >
                    <p className="font-bold cyber-font">{update.user}</p>
                    <p>UPDATED BLOCK {update.block}</p>
                    <p className="text-gray-500">{update.time}</p>
                  </div>
                ))
              ) : (
                <div className="bg-gray-100 p-2 border border-black text-xs text-center">
                  <p className="text-gray-500 cyber-font">NO RECENT ACTIVITY</p>
                  <p className="text-gray-400">BE THE FIRST TO BUY!</p>
                </div>
              )}
            </div>
          </Card>

          {connected && (
            /* Enhanced block management UI for admins */
            <Card className="p-4 bg-white border-4 border-black">
              <h3 className="font-bold text-xl mb-4 text-center comic-font">🎨 MY BLOCKS</h3>
              {userBlocks.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {userBlocks.map((block, index) => {
                    const isOwnBlock = block.owner === publicKey?.toString()
                    return (
                      <div
                        key={`${block.x}-${block.y}-${index}`}
                        className={`flex justify-between items-center p-2 border rounded ${
                          isOwnBlock ? "bg-green-50 border-green-300" : "bg-orange-50 border-orange-300"
                        }`}
                      >
                        <div className="text-sm">
                          <div className="font-bold text-black">
                            Block {block.x},{block.y} ({block.width}×{block.height})
                          </div>
                          {!isOwnBlock && (
                            <div className="text-xs text-orange-600">Owner: {block.owner?.slice(0, 8)}...</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {(isOwnBlock || isAdmin) && (
                            <Button
                              onClick={() => openUploadModal(block, index)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1"
                            >
                              UPLOAD DETAILS
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              onClick={() => handleRetractIndividualBlock(block)}
                              className={`text-xs px-2 py-1 ${
                                isOwnBlock
                                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                                  : "bg-red-600 hover:bg-red-700 text-white"
                              }`}
                            >
                              {isOwnBlock ? "🗑️ RETRACT" : "⚠️ FORCE RETRACT"}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {!userBlocks.length && (
                <p className="text-center text-black comic-font">
                  NO BLOCKS OWNED YET.
                  <br />
                  BUY SOME PIXELS TO GET STARTED!
                </p>
              )}
            </Card>
          )}
        </div>
      </div>

      <div className="text-center mt-12 p-6 bg-blue-600 text-white cyber-font border-4 border-black">
        <p className="text-lg font-bold">&gt; POWERED BY SOLANA BLOCKCHAIN &lt;</p>
        <p className="text-sm mt-2">YOUR PIXELS ARE LOCKED FOREVER ON-CHAIN • UPLOAD AND UPDATE ANYTIME</p>
        <div className="mt-4 flex justify-center items-center gap-4 text-xs">
          <span>© 2024 SOL PIXEL</span>
          <span className="blink">★ BEST VIEWED IN 1024x768 ★</span>
          <span>MADE WITH ❤️ AND NOSTALGIA</span>
        </div>
      </div>

      {selectedBlockForUpload && (
        <ImageUploadModal
          block={selectedBlockForUpload.block}
          blockIndex={selectedBlockForUpload.index}
          isOpen={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false)
            setSelectedBlockForUpload(null)
          }}
          onImageUpload={handleImageUpload}
        />
      )}

      {connected && publicKey && (
        <PaymentVerificationModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          walletAddress={publicKey.toString()}
          onPaymentVerified={handlePaymentVerified}
        />
      )}

      {usernameModalOpen && (
        <UsernameModal
          isOpen={usernameModalOpen}
          onClose={() => setUsernameModalOpen(false)}
          walletAddress={publicKey?.toString() || ""}
          currentUsername={currentUsername}
          onUsernameUpdate={setCurrentUsername}
        />
      )}

      {hoveredBlock && tooltipPosition && (
        <div
          className="fixed z-50 bg-black text-white p-3 rounded-lg shadow-lg max-w-xs pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          <p className="text-sm font-medium">{hoveredBlock.alt_text}</p>
          {hoveredBlock.url && <p className="text-xs text-gray-300 mt-1">Click to visit: {hoveredBlock.url}</p>}
        </div>
      )}
    </div>
  )
}
