export function JerseyHero() {
  return (
    <div className="bg-white border-4 border-black p-8 text-center">
      <h1 className="jersey-font text-6xl md:text-8xl font-normal text-black mb-4 leading-tight">SOL PIXEL</h1>

      <h2 className="jersey-font text-2xl md:text-4xl text-red-600 mb-6 blink">1M PIXELS FOREVER</h2>

      <p className="comic-font text-lg text-black mb-8 max-w-2xl mx-auto">
        Own your piece of digital history on the Solana blockchain! Buy pixels, upload your art, and be part of the
        eternal canvas.
      </p>

      <div className="space-y-4">
        <div className="jersey-font text-xl text-blue-600 rainbow-text">ONLY 1 CREDIT PER PIXEL</div>

        <button className="retro-button jersey-font text-xl px-8 py-4 bg-yellow-300 hover:bg-yellow-400 border-4 border-black">
          START BUYING PIXELS
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="retro-border bg-green-200 p-4">
          <div className="jersey-font text-2xl text-black">1,000,000</div>
          <div className="comic-font text-sm text-black">TOTAL PIXELS</div>
        </div>

        <div className="retro-border bg-blue-200 p-4">
          <div className="jersey-font text-2xl text-black">1,000,000</div>
          <div className="comic-font text-sm text-black">MAX CREDITS VALUE</div>
        </div>

        <div className="retro-border bg-red-200 p-4">
          <div className="jersey-font text-2xl text-black">FOREVER</div>
          <div className="comic-font text-sm text-black">OWNERSHIP</div>
        </div>
      </div>
    </div>
  )
}
