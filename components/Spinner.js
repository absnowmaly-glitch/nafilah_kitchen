export default function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-bounce" />
      </div>
      {label && <p className="text-xs text-stone-400 font-semibold">{label}</p>}
    </div>
  );
}
