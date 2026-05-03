export default function Loading() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="h-[60px] border-b border-zinc-200/80 bg-[#f5f5f7]/80" />
      <div className="p-7 space-y-7 animate-pulse">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-zinc-200/70" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-9 w-72 rounded-lg bg-zinc-200/70" />
          <div className="h-80 rounded-xl bg-zinc-200/70" />
        </div>
      </div>
    </div>
  )
}
