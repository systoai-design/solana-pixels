"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Upload, Loader2 } from "lucide-react"

interface PixelBlock {
  x: number
  y: number
  width: number
  height: number
  owner?: string
  imageUrl?: string
  color?: string
  url?: string
}

interface ImageUploadModalProps {
  block: PixelBlock
  isOpen: boolean
  onClose: () => void
  onImageUpload: (blockIndex: number, imageUrl: string, url?: string) => void
  blockIndex: number
}

export function ImageUploadModal({ block, isOpen, onClose, onImageUpload, blockIndex }: ImageUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [url, setUrl] = useState<string>(block.url || "")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be smaller than 5MB")
      return
    }

    setSelectedFile(file)
    setUploadError(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [handleFileSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const resizeImage = useCallback(
    (imageUrl: string): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const canvas = canvasRef.current
          if (!canvas) return

          canvas.width = block.width
          canvas.height = block.height

          const ctx = canvas.getContext("2d")
          if (!ctx) return

          // Draw image to fit the block dimensions
          ctx.drawImage(img, 0, 0, block.width, block.height)

          // Convert to data URL
          const resizedDataUrl = canvas.toDataURL("image/png")
          resolve(resizedDataUrl)
        }
        img.src = imageUrl
      })
    },
    [block.width, block.height],
  )

  const handleUpload = async () => {
    if (!selectedFile || !previewUrl) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // Resize image to fit block dimensions
      const resizedImageUrl = await resizeImage(previewUrl)

      // In a real implementation, you would upload to IPFS/Arweave here
      // For now, we'll use the resized data URL
      onImageUpload(blockIndex, resizedImageUrl, url.trim() || undefined)

      // Close modal
      onClose()
      setSelectedFile(null)
      setPreviewUrl(null)
      setUrl("")
    } catch (error) {
      setUploadError("Failed to process image")
      console.error("[v0] Image upload error:", error)
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <Card className="bg-white border-4 border-black shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Upload Image</h3>
            <Button size="sm" variant="ghost" onClick={onClose} className="border-2 border-black">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="bg-yellow-100 p-3 border-2 border-black">
              <p className="font-bold text-sm">Block Info:</p>
              <p className="text-xs">
                Size: {block.width}x{block.height} pixels
              </p>
              <p className="text-xs">
                Position: ({block.x}, {block.y})
              </p>
            </div>

            {/* File Upload Area */}
            <div
              className="border-4 border-dashed border-gray-400 p-6 text-center cursor-pointer hover:border-purple-600 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="space-y-2">
                  <img
                    src={previewUrl || "/placeholder.svg"}
                    alt="Preview"
                    className="max-w-full max-h-32 mx-auto pixel-perfect"
                  />
                  <p className="text-sm text-gray-600">Click to change image</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Drop an image here or click to select
                    <br />
                    <span className="text-xs">PNG, JPG, GIF up to 5MB</span>
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
            />

            <div className="space-y-2">
              <label className="block text-sm font-bold text-black">Website URL (Optional):</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full p-2 border-2 border-black text-sm"
              />
              <p className="text-xs text-gray-600">
                Add a link to make your pixels clickable! Perfect for advertising.
              </p>
            </div>

            {uploadError && <Badge className="bg-red-500 text-white w-full justify-center">{uploadError}</Badge>}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-2 border-black bg-transparent"
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white border-2 border-black"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload & Save"
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Hidden canvas for image resizing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
