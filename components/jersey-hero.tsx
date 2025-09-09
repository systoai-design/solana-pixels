export function JerseyHero() {
  return (
    <div className="bg-white border-4 border-black p-4 md:p-8 text-center">
      <h1 className="jersey-font text-4xl md:text-6xl lg:text-8xl font-normal text-black mb-4 leading-tight">
        SOL PIXEL
      </h1>

      <h2 className="jersey-font text-xl md:text-2xl lg:text-4xl text-red-600 mb-6 blink">1M PIXELS FOREVER</h2>

      <p className="comic-font text-sm md:text-lg text-black mb-8 max-w-2xl mx-auto px-4">
        Own your piece of digital history on the Solana blockchain! Buy pixels with SOL tokens, upload images with
        clickable links, add hover messages, and compete in pixel wars. Be part of the eternal advertising canvas.
      </p>

      <div className="space-y-4">
        <div className="jersey-font text-lg md:text-xl text-blue-600 rainbow-text">0.2 CREDITS PER PIXEL</div>
        <div className="jersey-font text-xs md:text-sm text-gray-600">≈ 2,000 PIXEL TOKENS PER PIXEL</div>

        <button className="retro-button jersey-font text-lg md:text-xl px-6 md:px-8 py-3 md:py-4 bg-yellow-300 hover:bg-yellow-400 border-4 border-black">
          START BUYING PIXELS
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4">
        <div className="retro-border bg-green-200 p-2 md:p-4">
          <div className="jersey-font text-lg md:text-2xl text-black">1,000,000</div>
          <div className="comic-font text-xs md:text-sm text-black">TOTAL PIXELS</div>
        </div>

        <div className="retro-border bg-blue-200 p-2 md:p-4">
          <div className="jersey-font text-lg md:text-2xl text-black">2B PIXEL</div>
          <div className="comic-font text-xs md:text-sm text-black">TOTAL VALUE</div>
        </div>

        <div className="retro-border bg-red-200 p-2 md:p-4">
          <div className="jersey-font text-lg md:text-2xl text-black">FOREVER</div>
          <div className="comic-font text-xs md:text-sm text-black">OWNERSHIP</div>
        </div>
      </div>
    </div>
  )
}
