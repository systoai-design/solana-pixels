"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface CreditsDisplayProps {
  credits: number
  onTopUp: () => void
}

export function CreditsDisplay({ credits, onTopUp }: CreditsDisplayProps) {
  return (
    <Card className="p-4 bg-yellow-100 border-2 border-black">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">💰 CREDITS</h3>
          <p className="text-2xl font-mono font-bold">{credits.toLocaleString()} CREDITS</p>
        </div>
        <Button onClick={onTopUp} className="bg-green-500 hover:bg-green-600 text-white font-bold">
          TOP UP
        </Button>
      </div>
    </Card>
  )
}
