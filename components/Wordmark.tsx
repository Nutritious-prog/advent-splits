export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`display flex items-center gap-2 text-lg leading-none ${className}`}>
      <span className="inline-block h-4 w-4 border-2 border-mustard" aria-hidden />
      <span>
        THE ADVENT <span className="text-mustard">SPLITS</span>
      </span>
    </span>
  );
}
