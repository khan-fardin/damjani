export function ProductArt({ tone = "laptop-silver", compact = false }: { tone?: string; compact?: boolean }) {
  return (
    <div className={`product-art ${tone} ${compact ? "product-art-compact" : ""}`} aria-hidden="true">
      <div className="laptop-device"><div className="laptop-screen"><span className="screen-glow" /><span className="screen-mark">d.</span></div><div className="laptop-base" /></div>
      <span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" />
    </div>
  );
}
