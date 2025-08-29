"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { WalletButton } from "@/components/wallet-button"
import { PurchaseButton } from "@/components/purchase-button"
import { ImageUploadModal } from "@/components/image-upload-modal"
import { VisitorCounter, ScrollingMarquee, BlinkingText, RainbowText, RetroStats } from "@/components/retro-elements"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

interface PixelBlock {
  id?: string
  x: number
  y: number
  width: number
  height: number
  owner?: string
  imageUrl?: string
  color?: string
  url?: string
}

const ADMIN_WALLETS = [
  "5zA5RkrFVF9n9eruetEdZFbcbQ2hNJnLrgPx1gc7AFnS", // Original admin
  "BUbC5ugi4tnscNowHrNfvNsU5SZfMfcnBv7NotvdWyq8", // Added new admin wallet
]

export default function SolanaEternalCanvas() {
  const { connected, publicKey } = useWallet()
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

  const [user, setUser] = useState<any>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  const isAdmin = connected && publicKey && ADMIN_WALLETS.includes(publicKey.toString())

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setIsAuthLoading(false)

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user || null)
      })

      return () => subscription.unsubscribe()
    }

    checkAuth()
  }, [])

  const getOrCreateUser = async (walletAddress: string): Promise<string | null> => {
    try {
      const supabase = createClient()

      // Check if user is authenticated
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        console.error("[v0] User not authenticated")
        return null
      }

      // Try to find existing user by auth ID first
      const { data: existingUser, error: findError } = await supabase
        .from("users")
        .select("id")
        .eq("id", authUser.id)
        .single()

      if (existingUser && !findError) {
        return existingUser.id
      }

      // If not found by auth ID, create or update user record
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .upsert({
          id: authUser.id, // Use auth user ID
          wallet_address: walletAddress,
          username: walletAddress.slice(0, 8) + "...",
          total_pixels_owned: 0,
          total_spent: 0,
        })
        .select("id")
        .single()

      if (createError) {
        console.error("[v0] Failed to create user:", createError)
        return null
      }

      return newUser.id
    } catch (error) {
      console.error("[v0] Error in getOrCreateUser:", error)
      return null
    }
  }

  const savePixelBlockToDatabase = async (block: PixelBlock) => {
    try {
      const supabase = createClient()

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        console.error("[v0] User not authenticated - cannot save pixel block")
        return false
      }

      let ownerId = null

      if (block.owner && block.owner !== "anonymous") {
        ownerId = await getOrCreateUser(block.owner)
      }

      if (!ownerId && block.owner && block.owner !== "anonymous") {
        console.error("[v0] Couldn't get user ID for:", block.owner)
        return false
      }

      const pricePerPixel = isAdmin ? 0.00000001 : 0.005
      const blockToInsert = {
        start_x: block.x,
        start_y: block.y,
        width: block.width,
        height: block.height,
        owner_id: ownerId,
        image_url: block.imageUrl || null,
        link_url: block.url || null,
        total_price: block.width * block.height * pricePerPixel,
        alt_text: `Pixel block at ${block.x},${block.y}`,
      }

      const { error: insertError } = await supabase.from("pixel_blocks").insert([blockToInsert])

      if (insertError) {
        console.error("[v0] Failed to save block to database:", insertError)
        return false
      }

      console.log("[v0] Successfully saved new block to database")
      return true
    } catch (error) {
      console.error("[v0] Database save error:", error)
      return false
    }
  }

  const updatePixelBlockInDatabase = async (block: PixelBlock) => {
    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from("pixel_blocks")
        .update({
          image_url: block.imageUrl || null,
          link_url: block.url || null,
        })
        .eq("start_x", block.x)
        .eq("start_y", block.y)
        .eq("width", block.width)
        .eq("height", block.height)

      if (updateError) {
        console.error("[v0] Failed to update block in database:", updateError)
        return false
      }

      console.log("[v0] Successfully updated block in database")
      return true
    } catch (error) {
      console.error("[v0] Database update error:", error)
      return false
    }
  }

  const deletePixelBlockFromDatabase = async (block: PixelBlock) => {
    try {
      const supabase = createClient()

      const { error: deleteError } = await supabase
        .from("pixel_blocks")
        .delete()
        .eq("start_x", block.x)
        .eq("start_y", block.y)
        .eq("width", block.width)
        .eq("height", block.height)

      if (deleteError) {
        console.error("[v0] Failed to delete block from database:", deleteError)
        return false
      }

      console.log("[v0] Successfully deleted block from database")
      return true
    } catch (error) {
      console.error("[v0] Database delete error:", error)
      return false
    }
  }

  const loadPixelBlocksFromDatabase = async (): Promise<PixelBlock[]> => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("pixel_blocks")
        .select(`
          *,
          users!pixel_blocks_owner_id_fkey (
            wallet_address
          )
        `)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("[v0] Failed to load blocks from database:", error)
        return []
      }

      const blocks: PixelBlock[] = (data || []).map((block) => ({
        id: block.id,
        x: block.start_x,
        y: block.start_y,
        width: block.width,
        height: block.height,
        owner: block.users?.wallet_address || undefined,
        imageUrl: block.image_url || undefined,
        url: block.link_url || undefined,
        color: block.image_url ? undefined : "#" + Math.floor(Math.random() * 16777215).toString(16),
      }))

      console.log("[v0] Successfully loaded", blocks.length, "blocks from database")
      return blocks
    } catch (error) {
      console.error("[v0] Database load error:", error)
      return []
    }
  }

  const syncPixelBlocks = useCallback(async () => {
    try {
      const databaseBlocks = await loadPixelBlocksFromDatabase()

      if (databaseBlocks.length !== pixelBlocks.length) {
        console.log("[v0] Syncing pixel blocks from database:", databaseBlocks.length, "blocks")
        setPixelBlocks(databaseBlocks)

        const totalPixels = databaseBlocks.reduce((total, block) => total + block.width * block.height, 0)
        setTotalPixelsSold(totalPixels)

        if (databaseBlocks.length > lastNotifiedBlockCount && databaseBlocks.length > 0) {
          const newBlocks = databaseBlocks.length - lastNotifiedBlockCount
          setNewBlockNotification(`${newBlocks} new pixel block${newBlocks > 1 ? "s" : ""} purchased!`)
          setLastNotifiedBlockCount(databaseBlocks.length)
          setTimeout(() => setNewBlockNotification(null), 3000)
        }

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
      console.error("[v0] Failed to sync from database:", error)
    }
  }, [pixelBlocks.length, lastNotifiedBlockCount])

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

    const syncInterval = setInterval(syncPixelBlocks, 3000)

    return () => {
      clearInterval(syncInterval)
    }
  }, [])

  const handlePurchaseSuccess = async (newBlock: PixelBlock) => {
    console.log("[v0] Processing purchase success for:", newBlock.owner, "at", newBlock.x, newBlock.y)

    if (!user) {
      console.error("[v0] User not authenticated - cannot process purchase")
      return
    }

    const saveSuccess = await savePixelBlockToDatabase(newBlock)

    if (saveSuccess) {
      console.log("[v0] Purchase successfully saved to database")
      const updatedBlocks = [...pixelBlocks, newBlock]
      setPixelBlocks(updatedBlocks)
      setTotalPixelsSold((prev) => prev + newBlock.width * newBlock.height)
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
  }

  const handleImageUpload = async (blockIndex: number, imageUrl: string, url?: string) => {
    const blockToUpdate = userBlocks[blockIndex]
    if (!blockToUpdate) return

    const updatedBlock = {
      ...blockToUpdate,
      imageUrl,
      ...(url !== undefined && { url }),
    }

    const updateSuccess = await updatePixelBlockInDatabase(updatedBlock)

    if (updateSuccess) {
      setPixelBlocks((prev) => {
        const updated = [...prev]
        const globalIndex = prev.findIndex(
          (block) => block.x === blockToUpdate.x && block.y === blockToUpdate.y && block.owner === blockToUpdate.owner,
        )

        if (globalIndex !== -1) {
          updated[globalIndex] = updatedBlock
        }
        return updated
      })

      const shortAddress = publicKey?.toString().slice(0, 8) + "..." || "Unknown"
      setRecentUpdates((prev) => [
        {
          user: shortAddress,
          block: `${blockToUpdate.x},${blockToUpdate.y}`,
          time: "Just now",
        },
        ...prev.slice(0, 4),
      ])
    } else {
      console.error("[v0] Failed to update image in database")
    }
  }

  const handleRetractPixels = async (area: { x: number; y: number; width: number; height: number }) => {
    const blocksToRemove = pixelBlocks.filter((block) => {
      return (
        block.x < area.x + area.width &&
        block.x + block.width > area.x &&
        block.y < area.y + area.height &&
        block.y + block.height > area.y
      )
    })

    let allDeleted = true
    for (const block of blocksToRemove) {
      const deleteSuccess = await deletePixelBlockFromDatabase(block)
      if (!deleteSuccess) {
        allDeleted = false
      }
    }

    if (allDeleted) {
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
  }

  const handleRetractIndividualBlock = async (blockToRemove: PixelBlock) => {
    const deleteSuccess = await deletePixelBlockFromDatabase(blockToRemove)

    if (deleteSuccess) {
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

    ctx.strokeStyle = "#e0e0e0"
    ctx.lineWidth = 1
    const gridSize = 10

    for (let i = 0; i <= canvas.width; i += gridSize) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, canvas.height)
      ctx.stroke()
    }

    for (let i = 0; i <= canvas.height; i += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(canvas.width, i)
      ctx.stroke()
    }

    pixelBlocks.forEach((block) => {
      if (block.imageUrl) {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, block.x, block.y, block.width, block.height)

          ctx.strokeStyle = "#000000"
          ctx.lineWidth = 2
          ctx.strokeRect(block.x, block.y, block.width, block.height)

          if (connected && publicKey && block.owner === publicKey.toString()) {
            ctx.strokeStyle = "#ffff00"
            ctx.lineWidth = 3
            ctx.strokeRect(block.x - 1, block.y - 1, block.width + 2, block.height + 2)
          }
        }
        img.src = block.imageUrl
      } else {
        ctx.fillStyle = block.color || "#cccccc"
        ctx.fillRect(block.x, block.y, block.width, block.height)

        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 2
        ctx.strokeRect(block.x, block.y, block.width, block.height)

        if (connected && publicKey && block.owner === publicKey.toString()) {
          ctx.strokeStyle = "#ffff00"
          ctx.lineWidth = 3
          ctx.strokeRect(block.x - 1, block.y - 1, block.width + 2, block.height + 2)
        }
      }
    })

    if (selectedArea) {
      ctx.strokeStyle = "#ff0000"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(selectedArea.x, selectedArea.y, selectedArea.width, selectedArea.height)

      ctx.fillStyle = "rgba(255, 0, 0, 0.1)"
      ctx.fillRect(selectedArea.x, selectedArea.y, selectedArea.width, selectedArea.height)
      ctx.setLineDash([])
    }
  }, [pixelBlocks, selectedArea, connected, publicKey])

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

    if (clickedBlock && clickedBlock.url) {
      let finalUrl = clickedBlock.url.trim()

      if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        finalUrl = "https://" + finalUrl
      }

      try {
        window.open(finalUrl, "_blank", "noopener,noreferrer")
      } catch (error) {
        console.error("[v0] Failed to open URL:", error)
        // Fallback: try to navigate in same window if popup fails
        window.location.href = finalUrl
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = 800
    canvas.height = 800

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
    {
      label: "SOL PER PIXEL",
      value: isAdmin ? "0.00000001" : "0.005",
      color: isAdmin ? "text-blue-600" : "text-green-600",
    },
    { label: "PIXELS LEFT", value: (1000000 - totalPixelsSold).toLocaleString(), color: "text-blue-600" },
  ]

  return (
    <div className="min-h-screen bg-white p-4">
      {newBlockNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-400 text-black px-6 py-3 border-4 border-black shadow-lg">
          <p className="font-bold comic-font text-center">🔥 {newBlockNotification} 🔥</p>
        </div>
      )}

      {!user && !isAuthLoading && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 border-4 border-black shadow-lg">
          <p className="font-bold text-sm">
            <Link href="/auth/login" className="underline hover:text-yellow-300">
              LOGIN REQUIRED
            </Link>{" "}
            to purchase pixels
          </p>
        </div>
      )}

      <div className="text-center mb-8">
        <div className="mb-6">
          <img
            src="/sol-pixel-banner.png"
            alt="Sol Pixel - 1M Pixel Banner"
            className="mx-auto max-w-full h-auto border-4 border-black shadow-lg"
            style={{ maxHeight: "200px" }}
          />
        </div>

        <h1 className="text-6xl font-bold text-black mb-4 jersey-font">
          🎨 <RainbowText>SOL PIXEL</RainbowText> 🎨
        </h1>
        <div className="bg-yellow-300 border-4 border-black p-4 inline-block">
          <p className="text-black font-bold text-xl comic-font">
            ⚡ <BlinkingText>OWN 1M PIXELS FOREVER</BlinkingText> ON THE BLOCKCHAIN! ⚡
          </p>
        </div>

        <div className="mt-4 flex justify-center items-center gap-4">
          <VisitorCounter />
          <div className="text-black cyber-font">ESTABLISHED 2024</div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 blink"></div>
              <span className="text-red-600 cyber-font text-sm font-bold">ADMIN MODE</span>
            </div>
          )}
          {user && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-green-600 cyber-font text-sm font-bold">AUTHENTICATED</span>
            </div>
          )}
        </div>
      </div>

      <ScrollingMarquee>
        🚨 HOT! NEW PIXELS AVAILABLE! 🚨 BUY NOW BEFORE THEY'RE GONE! 🚨 BLOCKCHAIN SECURED! 🚨 UPLOAD ANYTIME! 🚨
      </ScrollingMarquee>

      <div className="mb-6">
        <RetroStats stats={retroStats} />
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="p-4 bg-white border-4 border-black">
            <div className="bg-blue-600 p-2 mb-4">
              <h2 className="text-white cyber-font text-xl text-center font-bold">&gt; THE ETERNAL CANVAS &lt;</h2>
            </div>

            <div
              ref={containerRef}
              className="relative overflow-auto border-4 border-black bg-white"
              style={{ height: "800px", maxHeight: "800px" }}
            >
              <canvas
                ref={canvasRef}
                className="cursor-crosshair pixel-perfect"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleCanvasClick}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>

            <div className="mt-4 text-center">
              <p className="text-lg text-black mb-2 cyber-font font-bold">CLICK AND DRAG TO SELECT PIXELS</p>
              {selectedArea && (
                <div className="flex justify-center gap-2">
                  <Badge
                    className={`text-lg px-4 py-2 ${isValidSelection ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
                  >
                    SELECTED: {selectedArea.width}x{selectedArea.height} PIXELS (COST:{" "}
                    {isAdmin
                      ? (selectedArea.width * selectedArea.height * 0.00000001).toFixed(8) + " SOL"
                      : (selectedArea.width * selectedArea.height * 0.005).toFixed(3) + " SOL"}
                    )
                  </Badge>
                  {!isValidSelection && hasOverlap(selectedArea) && (
                    <Badge className="bg-red-500 text-white blink text-lg px-4 py-2">⚠️ OVERLAPS EXISTING BLOCKS!</Badge>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-4 bg-white border-4 border-black">
            <h3 className="font-bold text-xl mb-4 text-center comic-font text-black">🔗 CONNECT WALLET</h3>
            <WalletButton />
            {!user && (
              <div className="mt-2 p-2 bg-blue-200 border-2 border-black text-center">
                <p className="text-black font-bold text-sm mb-2">🔐 AUTHENTICATION REQUIRED</p>
                <div className="flex gap-2">
                  <Link href="/auth/login" className="flex-1">
                    <Button className="w-full text-xs bg-blue-500 hover:bg-blue-600 text-white border-2 border-black">
                      LOGIN
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up" className="flex-1">
                    <Button className="w-full text-xs bg-green-500 hover:bg-green-600 text-white border-2 border-black">
                      SIGN UP
                    </Button>
                  </Link>
                </div>
              </div>
            )}
            {isAdmin && (
              <div className="mt-2 p-2 bg-yellow-200 border-2 border-black text-center">
                <p className="text-black font-bold text-sm">👑 ADMIN ACCESS 👑</p>
              </div>
            )}
          </Card>

          <Card className="p-4 bg-white border-4 border-black">
            <h3 className="font-bold text-xl mb-4 text-center comic-font text-black">💸 BUY PIXELS</h3>
            <div className="space-y-3">
              <div className="bg-gray-200 p-3 border-2 border-black">
                <p className="font-bold comic-font text-black text-lg">MIN SIZE: 10x10 PIXELS</p>
                <p className="text-base text-black">PERFECT FOR LOGOS & ART!</p>
              </div>
              <div className="bg-gray-200 p-3 border-2 border-black">
                <p className="font-bold comic-font text-black text-lg">UPLOAD LATER!</p>
                <p className="text-base text-black">BUY NOW, UPLOAD ANYTIME</p>
              </div>
              {isAdmin && (
                <div className="bg-yellow-200 p-3 border-2 border-black">
                  <p className="font-bold comic-font text-black text-lg">ADMIN: 0.00000001 SOL/PIXEL!</p>
                  <p className="text-base text-black">MINIMAL BLOCKCHAIN COST</p>
                </div>
              )}
              {user ? (
                <PurchaseButton
                  selectedArea={selectedArea}
                  isValidSelection={isValidSelection}
                  onPurchaseSuccess={handlePurchaseSuccess}
                  isAdmin={isAdmin}
                  pixelBlocks={pixelBlocks}
                  onRetractPixels={handleRetractPixels}
                />
              ) : (
                <div className="p-3 bg-red-100 border-2 border-red-500 text-center">
                  <p className="text-red-700 font-bold text-sm">LOGIN REQUIRED TO PURCHASE PIXELS</p>
                  <Link href="/auth/login">
                    <Button className="mt-2 bg-red-500 hover:bg-red-600 text-white border-2 border-black">
                      LOGIN NOW
                    </Button>
                  </Link>
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
            <Card className="p-4 bg-white border-4 border-black">
              <h3 className="font-bold text-xl mb-4 text-center comic-font">🎨 MY BLOCKS</h3>
              {userBlocks.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {userBlocks.map((block, i) => (
                    <div key={i} className="bg-gray-100 p-2 border border-black text-xs">
                      <p className="font-bold cyber-font">BLOCK {i + 1}</p>
                      <p>
                        SIZE: {block.width}x{block.height}
                      </p>
                      <p>
                        POSITION: ({block.x}, {block.y})
                      </p>
                      {block.url && <p className="text-blue-600 truncate">URL: {block.url}</p>}
                      <div className="flex gap-1 mt-1">
                        <Button
                          size="sm"
                          className="retro-button text-xs flex-1"
                          onClick={() => openUploadModal(block, i)}
                        >
                          {block.imageUrl ? "CHANGE IMAGE" : "UPLOAD IMAGE"}
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 border-2 border-black"
                            onClick={() => handleRetractIndividualBlock(block)}
                          >
                            RETRACT
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
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
    </div>
  )
}
