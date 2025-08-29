"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, CheckCircle, AlertCircle } from "lucide-react"

interface PaymentVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  walletAddress: string
  onPaymentVerified: (credits: number) => void
}

const ADMIN_WALLET = "5zA5RkrFVF9n9eruetEdZFbcbQ2hNJnLrgPx1gc7AFnS"
const SOL_TO_CREDITS_RATE = 1000000 // 1 SOL = 1,000,000 credits

export function PaymentVerificationModal({
  isOpen,
  onClose,
  walletAddress,
  onPaymentVerified,
}: PaymentVerificationModalProps) {
  const [transactionSignature, setTransactionSignature] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const verifyTransaction = async () => {
    if (!transactionSignature.trim()) {
      setErrorMessage("Please enter a transaction signature")
      setVerificationStatus("error")
      return
    }

    setIsVerifying(true)
    setVerificationStatus("idle")
    setErrorMessage("")

    try {
      const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTransaction",
          params: [
            transactionSignature.trim(),
            {
              encoding: "json",
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch transaction: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(`Transaction not found: ${data.error.message}`)
      }

      const transaction = data.result

      if (!transaction || !transaction.meta || transaction.meta.err) {
        throw new Error("Transaction not found or failed")
      }

      const { preBalances, postBalances, accountKeys } = transaction.transaction.message
      const { meta } = transaction

      let transferAmount = 0
      let isValidTransfer = false

      // Find admin wallet and user wallet indices
      const adminIndex = accountKeys.findIndex((key: string) => key === ADMIN_WALLET)
      const userIndex = accountKeys.findIndex((key: string) => key === walletAddress)

      if (adminIndex !== -1 && userIndex !== -1) {
        const adminBalanceChange = postBalances[adminIndex] - preBalances[adminIndex]
        const userBalanceChange = postBalances[userIndex] - preBalances[userIndex]

        // Check if SOL was transferred from user to admin
        if (adminBalanceChange > 0 && userBalanceChange < 0) {
          // Account for transaction fees by checking if the amounts roughly match
          const feeAdjustedUserChange = Math.abs(userBalanceChange) - (meta.fee || 0)
          if (Math.abs(feeAdjustedUserChange - adminBalanceChange) < 10000) {
            // Allow small discrepancy
            transferAmount = adminBalanceChange
            isValidTransfer = true
          }
        }
      }

      if (!isValidTransfer || transferAmount <= 0) {
        throw new Error("No valid SOL transfer to admin wallet found in this transaction")
      }

      const solAmount = transferAmount / 1000000000 // Convert lamports to SOL
      const credits = Math.floor(solAmount * SOL_TO_CREDITS_RATE)

      if (credits < 1000) {
        throw new Error("Minimum transfer amount is 0.001 SOL (1,000 credits)")
      }

      const supabase = (await import("@/lib/supabase/client")).createClient()

      const { data: userData, error: userError } = await supabase
        .from("users")
        .upsert(
          {
            wallet_address: walletAddress,
            credits: credits,
          },
          {
            onConflict: "wallet_address",
            ignoreDuplicates: false,
          },
        )
        .select()
        .single()

      if (userError) {
        console.error("[v0] Failed to update user credits:", userError)
        throw new Error("Failed to update credits in database")
      }

      await supabase.from("payments").insert({
        user_id: userData.id,
        transaction_signature: transactionSignature.trim(),
        amount_sol: solAmount,
        credits_granted: credits,
        status: "verified",
      })

      console.log(`[v0] Payment verified: ${solAmount} SOL = ${credits} credits`)
      setVerificationStatus("success")
      onPaymentVerified(credits)

      setTimeout(() => {
        onClose()
        setTransactionSignature("")
        setVerificationStatus("idle")
      }, 2000)
    } catch (error) {
      console.error("[v0] Payment verification failed:", error)
      setErrorMessage(error instanceof Error ? error.message : "Verification failed")
      setVerificationStatus("error")
    } finally {
      setIsVerifying(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white border-2 border-black">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold">💰 VERIFY PAYMENT</CardTitle>
          <CardDescription>Send SOL to admin wallet, then verify your transaction</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold">1. Send SOL to Admin Wallet:</Label>
            <div className="flex items-center gap-2 p-2 bg-yellow-100 border border-black rounded">
              <code className="text-xs flex-1 break-all">{ADMIN_WALLET}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(ADMIN_WALLET)}
                className="border-black"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="p-2 bg-blue-100 border border-black rounded">
            <p className="text-sm font-bold">Rate: 1 SOL = 1,000,000 Credits</p>
            <p className="text-xs">Minimum: 0.001 SOL = 1,000 Credits</p>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">2. Enter Transaction Signature:</Label>
            <Input
              placeholder="Paste your transaction signature here..."
              value={transactionSignature}
              onChange={(e) => setTransactionSignature(e.target.value)}
              className="border-black"
              disabled={isVerifying}
            />
          </div>

          {verificationStatus === "success" && (
            <div className="flex items-center gap-2 p-2 bg-green-100 border border-green-500 rounded">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-bold text-green-700">Payment Verified! Credits Added!</span>
            </div>
          )}

          {verificationStatus === "error" && (
            <div className="flex items-center gap-2 p-2 bg-red-100 border border-red-500 rounded">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">{errorMessage}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={verifyTransaction}
              disabled={isVerifying || !transactionSignature.trim()}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white border-black"
            >
              {isVerifying ? "Verifying..." : "Verify Payment"}
            </Button>
            <Button onClick={onClose} variant="outline" className="border-black bg-transparent" disabled={isVerifying}>
              Cancel
            </Button>
          </div>

          <div className="text-xs text-gray-600 space-y-1">
            <p>• Send SOL from any wallet app to the admin address above</p>
            <p>• Copy the transaction signature from your wallet</p>
            <p>• Paste it here to verify and receive credits instantly</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
