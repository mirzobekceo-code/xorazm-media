export function ProfIcon({ svg, className = "ic" }: { svg: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

export function Verified({ size }: { size?: number }) {
  return (
    <svg className="ver" viewBox="0 0 16 16" role="img" aria-label="Tasdiqlangan" style={size ? { width: size, height: size } : undefined}>
      <circle cx="8" cy="8" r="8" fill="currentColor" />
      <path d="M4.6 8.2l2.2 2.2 4.6-4.6" stroke="var(--bg)" strokeWidth="1.8" fill="none" />
    </svg>
  );
}
