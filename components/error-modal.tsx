"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message?: string
}

export function ErrorModal({
  isOpen,
  onClose,
  title = "Payment Error",
  message = "We were unable to process your payment. Please contact support with your transaction signature for assistance.",
}: ErrorModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>

          <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>

          <Button
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
