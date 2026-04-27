export default function Loading() {
  return (
    <div className="flex flex-col" style={{ height: "calc(100svh - 52px)" }}>
      <div className="px-5 py-4 shrink-0" style={{ background: "linear-gradient(to right, #f39447, #ffa070)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20" />
          <div className="space-y-1.5">
            <div className="h-4 w-20 rounded-full bg-white/30" />
            <div className="h-3 w-32 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
      <div className="flex-1 bg-[#fdf8f3]" />
    </div>
  );
}
