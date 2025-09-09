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

const ADMIN_WALLET = "8AuzH3n5RuGPYVyeh94JgoFGcofUJFLtWm9gwYaV7Euo"
const TOKENS_TO_CREDITS_RATE = 100 / 200000 // 200,000 PIXEL tokens = 100 credits
const PIXEL_TOKEN_ADDRESS = "TBA" // Updated PIXEL token address to new contract address
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

    const trimmedSignature = transactionSignature.trim()
    if (trimmedSignature.length < 80 || trimmedSignature.length > 90) {
      setErrorMessage("Invalid transaction signature format. Please check and try again.")
      setVerificationStatus("error")
      return
    }

    setIsVerifying(true)
    setVerificationStatus("idle")
    setErrorMessage("")

    try {
      const supabase = createClient({
        supabaseUrl: "https://tomdwpozafthjxgbvoau.supabase.co",
        supabaseKey:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbWR3cG96YWZ0aGp4Z2J2b2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTE2MTksImV4cCI6MjA3MTkyNzYxOX0.vxD10P1s0BCQaBu2GmmrviuyWsS99IP05qnZ7567niM",
      })

      console.log(`[v0] Checking for duplicate transaction: ${trimmedSignature}`)
      const { data: existingPayment, error: paymentCheckError } = await supabase
        .from("payments")
        .select("id, credits_granted")
        .eq("transaction_signature", trimmedSignature)
        .maybeSingle()

      if (paymentCheckError) {
        console.error("[v0] Error checking existing payment:", paymentCheckError)
        throw new Error("Database error while checking payment history")
      }

      if (existingPayment) {
        console.log(`[v0] Duplicate transaction detected: ${trimmedSignature}`)
        throw new Error("This transaction has already been processed and credits have been granted")
      }

      const connection = new Connection(RPC_ENDPOINT, "confirmed")
      const adminWalletPubkey = new PublicKey(ADMIN_WALLET)
      const pixelTokenMint = new PublicKey(PIXEL_TOKEN_ADDRESS)

      console.log(`[v0] Verifying PIXEL token transaction: ${trimmedSignature}`)

      let transaction
      try {
        transaction = await connection.getParsedTransaction(trimmedSignature, {
          maxSupportedTransactionVersion: 0,
        })
      } catch (fetchError) {
        console.error("[v0] Transaction fetch error:", fetchError)
        throw new Error("Invalid transaction signature or transaction not found")
      }

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
        if ("parsed" in instruction && instruction.program === "spl-token") {
          const parsed = instruction.parsed
          if (parsed.type === "transfer" || parsed.type === "transferChecked") {
            const info = parsed.info

            // Verify token mint address matches PIXEL
            if (info.mint && info.mint !== PIXEL_TOKEN_ADDRESS) {
              continue
            }

            // Check if transfer is to admin wallet
            const recipientKey = new PublicKey(info.destination)
            const senderKey = new PublicKey(info.source)

            // For token transfers, we need to check the token account owners
            const recipientAccountInfo = await connection.getParsedAccountInfo(recipientKey)
            const senderAccountInfo = await connection.getParsedAccountInfo(senderKey)

            if (recipientAccountInfo.value?.data && "parsed" in recipientAccountInfo.value.data) {
              const recipientData = recipientAccountInfo.value.data.parsed.info
              if (recipientData.owner === ADMIN_WALLET) {
                if (senderAccountInfo.value?.data && "parsed" in senderAccountInfo.value.data) {
                  const senderData = senderAccountInfo.value.data.parsed.info
                  if (senderData.owner === walletAddress) {
                    transferAmount = Number.parseInt(info.amount || info.tokenAmount?.amount || "0")
                    isValidTransfer = true
                    break
                  }
                }
              }
            }
          }
        }
      }

      if (!isValidTransfer || transferAmount <= 0) {
        throw new Error("No valid PIXEL token transfer to admin wallet found in this transaction")
      }

      const tokenAmount = transferAmount / 1000000 // Convert from token decimals (assuming 6 decimals for PIXEL)
      const credits = Math.floor(tokenAmount * TOKENS_TO_CREDITS_RATE)

      console.log(`[v0] Transaction verified: ${tokenAmount} PIXEL tokens = ${credits} credits`)

      if (tokenAmount < 2000) {
        // Minimum 100 tokens for 0.001 credits
        throw new Error("Minimum transfer amount is 2000 PIXEL tokens")
      }

      const { data: duplicateCheck, error: duplicateError } = await supabase
        .from("payments")
        .select("id")
        .eq("transaction_signature", trimmedSignature)
        .maybeSingle()

      if (duplicateError) {
        console.error("[v0] Error in duplicate check:", duplicateError)
        throw new Error("Database error during final duplicate check")
      }

      if (duplicateCheck) {
        console.log(`[v0] Duplicate transaction caught in final check: ${trimmedSignature}`)
        throw new Error("This transaction was processed by another request")
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

      const { error: paymentError } = await supabase.from("payments").insert({
        wallet_address: walletAddress,
        transaction_signature: trimmedSignature,
        amount_sol: tokenAmount / 1000000, // Convert large token amount to smaller decimal value
        credits_granted: credits,
        status: "verified",
      })

      if (paymentError) {
        console.error("[v0] Failed to record payment:", paymentError)
        throw new Error("Failed to record payment. Please contact support.")
      }

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

      console.log(`[v0] Payment verification successful: ${tokenAmount} PIXEL tokens = ${credits} credits`)

      setVerificationStatus("success")
      onPaymentVerified(credits) // Pass only new credits, not total
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
            <CardDescription>Send PIXEL tokens to admin wallet, then verify your transaction</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">1. Send PIXEL Tokens to Admin Wallet:</Label>
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
              <p className="text-sm font-bold">Rate: 200,000 PIXEL Tokens = 100 Credits</p>
              <p className="text-xs">Minimum: 2000 PIXEL = 0.001 Credits</p>
              <p className="text-xs text-gray-600">Token: {PIXEL_TOKEN_ADDRESS}</p>
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
              <p>• Send PIXEL tokens from any wallet app to the admin address above</p>
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
