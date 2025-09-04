"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@supabase/supabase-js"

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
      const supabase = createClient(
        "https://tomdwpozafthjxgbvoau.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTE2MTksImV4cCI6MjA3MTkyNzYxOX0.vxD10P1s0BCQaBu2GmmrviuyWsS99IP05qnZ7567niM",
      )

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
        console.log("[v0] Username saved successfully:", username.trim())
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
