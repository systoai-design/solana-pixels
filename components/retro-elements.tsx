"use client"

import type React from "react"

import { useState, useEffect } from "react"

export function VisitorCounter() {
  const [count, setCount] = useState(1337420)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => prev + Math.floor(Math.random() * 3))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return <div className="visitor-counter inline-block">VISITORS: {count.toLocaleString()}</div>
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
