"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface UsernameModalProps {
  isOpen: boolean
  onClose: () => void
  walletAddress: string
  currentUsername?: string
  onUsernameUpdate: (newUsername: string) => void
}

export function UsernameModal({
  isOpen,
  onClose,
  walletAddress,
  currentUsername,
  onUsernameUpdate,
}: UsernameModalProps) {
  const [username, setUsername] = useState(currentUsername || "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen) return null

  const handleSave = async () => {
    if (!username.trim()) {
      setError("Username cannot be empty")
      return
    }

    if (username.length > 20) {
      setError("Username must be 20 characters or less")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from("wallet_credits")
        .upsert({
          wallet_address: walletAddress,
          username: username.trim(),
          credits: 0,
        })
        .eq("wallet_address", walletAddress)

      if (updateError) {
        setError("Failed to update username")
        console.error("[v0] Failed to update username:", updateError)
      } else {
        onUsernameUpdate(username.trim())
        onClose()
      }
    } catch (error) {
      setError("Failed to update username")
      console.error("[v0] Error updating username:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Set Username</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Enter your username"
            maxLength={20}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isLoading} className="flex-1">
            {isLoading ? "Saving..." : "Save"}
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
