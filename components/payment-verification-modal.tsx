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
const SOL_TO_CREDITS_RATE = 1000000 // Updated to 1 SOL = 1,000,000 credits to match pricing
const RPC_ENDPOINTS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-api.projectserum.com",
  "https://rpc.ankr.com/solana",
  "https://solana-rpc.publicnode.com",
]

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

  const getOrCreateUser = async (supabase: any, walletAddress: string) => {
    try {
      // First, try to find existing user
      const { data: existingUser, error: findError } = await supabase
        .from("users")
        .select("id, credits")
        .eq("wallet_address", walletAddress)
        .single()

      if (existingUser && !findError) {
        console.log("[v0] Found existing user:", existingUser.id)
        return existingUser
      }

      // If user doesn't exist, create new user with proper defaults
      console.log("[v0] Creating new user for wallet:", walletAddress)
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          wallet_address: walletAddress,
          credits: 0,
          total_spent: 0,
          total_pixels_owned: 0,
          username: null,
          avatar_url: null,
        })
        .select("id, credits")
        .single()

      if (createError) {
        console.error("[v0] Failed to create user:", createError)
        // Provide more specific error messages
        if (createError.code === "23505") {
          throw new Error("User account already exists but could not be retrieved")
        } else if (createError.code === "42501") {
          throw new Error("Database permission error - please contact support")
        } else {
          throw new Error(`Failed to create user account: ${createError.message}`)
        }
      }

      console.log("[v0] Successfully created new user:", newUser.id)
      return newUser
    } catch (error) {
      console.error("[v0] Error in getOrCreateUser:", error)
      throw error
    }
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
      console.log("[v0] Starting transaction verification for:", transactionSignature.trim())

      let connection: Connection | null = null
      let transaction = null

      for (const endpoint of RPC_ENDPOINTS) {
        try {
          console.log("[v0] Trying RPC endpoint:", endpoint)
          connection = new Connection(endpoint, "confirmed")

          transaction = await connection.getParsedTransaction(transactionSignature.trim(), {
            maxSupportedTransactionVersion: 0,
          })

          if (transaction) {
            console.log("[v0] Successfully fetched transaction from:", endpoint)
            break
          }
        } catch (rpcError) {
          console.log("[v0] RPC endpoint failed:", endpoint, rpcError)
          continue
        }
      }

      if (!transaction) {
        throw new Error("Transaction not found on any RPC endpoint. Please check the signature and try again.")
      }

      console.log("[v0] Transaction found:", transaction)

      if (transaction.meta?.err) {
        console.log("[v0] Transaction failed on blockchain:", transaction.meta.err)
        throw new Error("Transaction failed on blockchain.")
      }

      const adminWalletPubkey = new PublicKey(ADMIN_WALLET)
      let transferAmount = 0
      let isValidTransfer = false

      const instructions = transaction.transaction.message.instructions
      console.log("[v0] Analyzing", instructions.length, "instructions")

      for (const instruction of instructions) {
        if ("parsed" in instruction && instruction.program === "system") {
          const parsed = instruction.parsed
          console.log("[v0] Found system instruction:", parsed.type)

          if (parsed.type === "transfer") {
            const recipientKey = new PublicKey(parsed.info.destination)
            const senderKey = new PublicKey(parsed.info.source)

            console.log("[v0] Transfer details:", {
              from: senderKey.toBase58(),
              to: recipientKey.toBase58(),
              amount: parsed.info.lamports,
              expectedSender: walletAddress,
              expectedRecipient: ADMIN_WALLET,
            })

            if (recipientKey.equals(adminWalletPubkey) && senderKey.toBase58() === walletAddress) {
              transferAmount = parsed.info.lamports
              isValidTransfer = true
              console.log("[v0] Valid transfer found:", transferAmount, "lamports")
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

      console.log("[v0] Calculated:", solAmount, "SOL =", credits, "credits")

      if (solAmount < 0.001) {
        throw new Error("Minimum transfer amount is 0.001 SOL (1,000 credits)")
      }

      const supabase = createClient()
      console.log("[v0] Getting or creating user for wallet:", walletAddress)

      const user = await getOrCreateUser(supabase, walletAddress)
      const newTotalCredits = user.credits + credits

      console.log("[v0] Updating user credits from", user.credits, "to", newTotalCredits)

      // Update user credits
      const { error: updateError } = await supabase.from("users").update({ credits: newTotalCredits }).eq("id", user.id)

      if (updateError) {
        console.error("[v0] Failed to update user credits:", updateError)
        throw new Error(`Failed to update credits in database: ${updateError.message}`)
      }

      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("transaction_signature", transactionSignature.trim())
        .single()

      if (!existingPayment) {
        // Record the payment
        const { error: paymentError } = await supabase.from("payments").insert({
          user_id: user.id,
          transaction_signature: transactionSignature.trim(),
          amount_sol: solAmount,
          credits_granted: credits,
          status: "verified",
        })

        if (paymentError) {
          console.error("[v0] Failed to record payment:", paymentError)
          // Don't throw here - credits were already added successfully
        }
      } else {
        console.log("[v0] Payment already recorded, skipping duplicate")
      }

      console.log(`[v0] Payment verified successfully: ${solAmount} SOL = ${credits} credits`)
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

      if (
        errorMsg.includes("database") ||
        errorMsg.includes("user") ||
        errorMsg.includes("credits") ||
        errorMsg.includes("permission")
      ) {
        setShowErrorModal(true)
      }
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
