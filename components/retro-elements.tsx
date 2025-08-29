"use client"

import type React from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useState, useEffect } from "react"

export function VisitorCounter() {
  const [count, setCount] = useState(0) // Start with 0 instead of fake base count, show real visitor data only
  const [sessionId] = useState(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  })

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.log("[v0] Supabase environment variables not configured, showing 0 visitors")
      setCount(0)
      return
    }

    const supabase = createBrowserClient(supabaseUrl, supabaseKey)

    const trackVisitor = async () => {
      try {
        await supabase.from("visitors").upsert(
          {
            session_id: sessionId,
            ip_address: "unknown", // Client-side can't get real IP
            user_agent: navigator.userAgent,
            last_activity: new Date().toISOString(),
            is_active: true,
          },
          {
            onConflict: "session_id",
          },
        )
      } catch (error) {
        console.log("[v0] Error tracking visitor:", error)
      }
    }

    const updateVisitorCount = async () => {
      try {
        // Clean up inactive visitors (older than 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        await supabase.from("visitors").update({ is_active: false }).lt("last_activity", fiveMinutesAgo)

        // Get active visitor count
        const { count: activeCount } = await supabase
          .from("visitors")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)

        if (activeCount !== null) {
          setCount(activeCount)
        }
      } catch (error) {
        console.log("[v0] Error updating visitor count:", error)
      }
    }

    const updateActivity = async () => {
      try {
        await supabase
          .from("visitors")
          .update({
            last_activity: new Date().toISOString(),
            is_active: true,
          })
          .eq("session_id", sessionId)
      } catch (error) {
        console.log("[v0] Error updating activity:", error)
      }
    }

    // Initial tracking and count update
    trackVisitor()
    updateVisitorCount()

    const countInterval = setInterval(updateVisitorCount, 10000) // Update count every 10 seconds
    const activityInterval = setInterval(updateActivity, 30000) // Update activity every 30 seconds

    const handleBeforeUnload = () => {
      navigator.sendBeacon("/api/visitor-inactive", JSON.stringify({ sessionId }))
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      clearInterval(countInterval)
      clearInterval(activityInterval)
      window.removeEventListener("beforeunload", handleBeforeUnload)

      supabase
        .from("visitors")
        .update({ is_active: false })
        .eq("session_id", sessionId)
        .then(() => {})
        .catch(() => {})
    }
  }, [sessionId])

  return (
    <div className="visitor-counter inline-block">
      <span className="text-green-600 cyber-font font-bold">VISITORS: {count.toLocaleString()}</span>
    </div>
  )
}

export function ScrollingMarquee({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden bg-black text-green-400 py-2 border-2 border-green-400">
      <div className="scroll-text cyber-font">{children}</div>
    </div>
  )
}

export function RetroButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`retro-button px-4 py-2 font-bold ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  )
}

export function NeonText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`neon-glow cyber-font ${className}`}>{children}</span>
}

export function BlinkingText({ children }: { children: React.ReactNode }) {
  return <span className="blink font-bold">{children}</span>
}

export function RainbowText({ children }: { children: React.ReactNode }) {
  return <span className="rainbow-text">{children}</span>
}

export function UnderConstruction() {
  return (
    <div className="under-construction text-center my-4">
      🚧 UNDER CONSTRUCTION 🚧 BEST VIEWED IN NETSCAPE NAVIGATOR 🚧
    </div>
  )
}

export function RetroStats({ stats }: { stats: Array<{ label: string; value: string; color: string }> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="retro-border p-4 text-center retro-bounce" style={{ animationDelay: `${i * 0.2}s` }}>
          <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          <div className="text-sm font-bold mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
