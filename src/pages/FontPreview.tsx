const fonts = [
  "Cormorant Garamond",
  "Cinzel",
  "Playfair Display",
  "DM Serif Display",
  "Bodoni Moda",
  "Libre Baskerville",
  "Abril Fatface",
  "Marcellus",
  "Spectral",
  "Philosopher",
];

export default function FontPreview() {
  return (
    <div className="min-h-screen bg-felt p-8">
      <h2 className="text-muted-foreground text-sm mb-8 text-center">
        Font Preview — THR33s Wordmark
      </h2>
      <div className="max-w-2xl mx-auto space-y-6">
        {fonts.map((font) => (
          <div
            key={font}
            className="flex items-center justify-between bg-card/60 backdrop-blur-sm rounded-xl p-6"
          >
            <span
              className="text-4xl md:text-5xl font-bold text-primary tracking-[0.3em]"
              style={{
                fontFamily: `'${font}', serif`,
                WebkitTextStroke: "1.5px hsl(0, 70%, 45%)",
                paintOrder: "stroke fill",
              }}
            >
              THR33s
            </span>
            <span className="text-xs text-muted-foreground ml-4 shrink-0">
              {font}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
