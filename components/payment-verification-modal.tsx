"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, CheckCircle, AlertCircle } from "lucide-react"
import { Connection, PublicKey } from "@solana/web3.js"
import { ErrorModal } from "./error-modal"
import { createClient } from "@/lib/supabase/client"

interface PaymentVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  walletAddress: string
  onPaymentVerified: (credits: number) => void
}

const ADMIN_WALLET = "5zA5RkrFVF9n9eruetEdZFbcbQ2hNJnLrgPx1gc7AFnS"
const SOL_TO_CREDITS_RATE = 1000 // 1 SOL = 1,000 credits
const RPC_ENDPOINT = "https://solana-rpc.publicnode.com"

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
  const [showErrorModal, setShowErrorModal] = useState(false)

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
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        console.log("[v0] Supabase environment variables not configured")
        throw new Error("Database connection not available. Please contact support to enable payment verification.")
      }

      const supabase = createClient()

      const connection = new Connection(RPC_ENDPOINT, "confirmed")
      const adminWalletPubkey = new PublicKey(ADMIN_WALLET)

      console.log(`[v0] Verifying transaction: ${transactionSignature.trim()}`)

      const transaction = await connection.getParsedTransaction(transactionSignature.trim(), {
        maxSupportedTransactionVersion: 0,
      })

      if (!transaction) {
        throw new Error("Transaction not found or could not be fetched.")
      }

      if (transaction.meta?.err) {
        throw new Error("Transaction failed on blockchain.")
      }

      let transferAmount = 0
      let isValidTransfer = false

      const instructions = transaction.transaction.message.instructions

      for (const instruction of instructions) {
        if ("parsed" in instruction && instruction.program === "system") {
          const parsed = instruction.parsed
          if (parsed.type === "transfer") {
            const recipientKey = new PublicKey(parsed.info.destination)
            const senderKey = new PublicKey(parsed.info.source)

            if (recipientKey.equals(adminWalletPubkey) && senderKey.toBase58() === walletAddress) {
              transferAmount = parsed.info.lamports
              isValidTransfer = true
              break
            }
          }
        }
      }

      if (!isValidTransfer || transferAmount <= 0) {
        throw new Error("No valid SOL transfer to admin wallet found in this transaction")
      }

      const solAmount = transferAmount / 1000000000 // Convert lamports to SOL
      const credits = Math.floor(solAmount * SOL_TO_CREDITS_RATE)

      console.log(`[v0] Transaction verified: ${solAmount} SOL = ${credits} credits`)

      if (solAmount < 0.001) {
        throw new Error("Minimum transfer amount is 0.001 SOL (1 credit)")
      }

      const { data: existingPayment, error: paymentCheckError } = await supabase
        .from("payments")
        .select("id")
        .eq("transaction_signature", transactionSignature.trim())
        .maybeSingle()

      if (paymentCheckError) {
        console.error("[v0] Error checking existing payment:", paymentCheckError)
        throw new Error("Database error while checking payment history")
      }

      if (existingPayment) {
        throw new Error("This transaction has already been processed")
      }

      const { data: walletCredits, error: creditsError } = await supabase
        .from("wallet_credits")
        .select("credits")
        .eq("wallet_address", walletAddress)
        .maybeSingle()

      if (creditsError) {
        console.error("[v0] Error fetching wallet credits:", creditsError)
        throw new Error("Database error while fetching current credits")
      }

      const currentCredits = walletCredits?.credits || 0
      const newTotalCredits = currentCredits + credits

      console.log(`[v0] Updating credits: ${currentCredits} + ${credits} = ${newTotalCredits}`)

      const { error: upsertError } = await supabase.from("wallet_credits").upsert({
        wallet_address: walletAddress,
        credits: newTotalCredits,
        username: walletAddress.slice(0, 8) + "...",
        updated_at: new Date().toISOString(),
      })

      if (upsertError) {
        console.error("[v0] Failed to update wallet credits:", upsertError)
        throw new Error("Failed to update credits. Please contact support.")
      }

      const { error: paymentError } = await supabase.from("payments").insert({
        wallet_address: walletAddress,
        transaction_signature: transactionSignature.trim(),
        amount_sol: solAmount,
        credits_granted: credits,
        status: "verified",
      })

      if (paymentError) {
        console.error("[v0] Failed to record payment:", paymentError)
      }

      console.log(`[v0] Payment verification successful: ${solAmount} SOL = ${credits} credits`)
      setVerificationStatus("success")
      onPaymentVerified(credits)

      setTimeout(() => {
        onClose()
        setTransactionSignature("")
        setVerificationStatus("idle")
      }, 2000)
    } catch (error) {
      console.error("[v0] Payment verification failed:", error)
      const errorMsg = error instanceof Error ? error.message : "Verification failed"
      setErrorMessage(errorMsg)
      setVerificationStatus("error")
    } finally {
      setIsVerifying(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
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
              <p className="text-sm font-bold">Rate: 1 SOL = 1,000 Credits</p>
              <p className="text-xs">Minimum: 0.001 SOL = 1 Credit</p>
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
              <Button
                onClick={onClose}
                variant="outline"
                className="border-black bg-transparent"
                disabled={isVerifying}
              >
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

      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Payment Processing Error"
        message={`We encountered an issue processing your payment: ${errorMessage}. Please contact support with your transaction signature: ${transactionSignature}`}
      />
    </>
  )
}
