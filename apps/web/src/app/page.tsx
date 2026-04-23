import Link from "next/link";

const features = [
  {
    icon: "receipt_long",
    title: "Curated Recipes",
    desc: "Browse a growing library of chef-quality recipes across every cuisine.",
  },
  {
    icon: "tune",
    title: "Smart Planning",
    desc: "Pick recipes, set servings, and Chef aggregates every ingredient automatically.",
  },
  {
    icon: "shopping_cart",
    title: "Instant Grocery Cart",
    desc: "One click sends your ingredients to your retailer of choice — Kroger, Instacart, and more.",
  },
  {
    icon: "track_changes",
    title: "Full Cart Control",
    desc: "Swap products, adjust quantities, or add extras before you checkout.",
  },
];

const steps = [
  { n: "01", title: "Pick recipes", desc: "Browse our library and select what you want to cook this week." },
  { n: "02", title: "Generate a cart", desc: "Chef aggregates all ingredients across your recipes and matches them to real retailer products." },
  { n: "03", title: "Order groceries", desc: "Review your cart, tweak anything, and check out — all without leaving the app." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1c1a]">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 bg-[#faf9f6]/90 backdrop-blur-sm border-b border-[#d7c2b9]/30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-black text-[#ffb38e] tracking-tight">Chef</span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-label-md text-[#52443d] hover:text-[#1a1c1a] transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 bg-[#895032] text-white text-label-md font-semibold px-4 py-2 rounded-full hover:bg-[#7a4326] transition-colors shadow-sm"
            >
              Get started
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-[#efe3b3] text-[#6d643f] text-label-sm font-semibold px-4 py-1.5 rounded-full mb-8">
          <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
          Meal planning, reimagined
        </div>
        <h1 className="text-[clamp(2.5rem,6vw,4rem)] font-black text-[#1a1c1a] leading-[1.1] tracking-tight max-w-3xl mx-auto">
          From recipes to{" "}
          <span className="text-[#895032]">grocery cart</span>{" "}
          in one click.
        </h1>
        <p className="text-body-lg text-[#52443d] mt-6 max-w-xl mx-auto leading-relaxed">
          Chef turns your weekly recipe picks into a ready-to-order grocery cart —
          with every ingredient measured, aggregated, and matched to real retailer products.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#895032] text-white font-semibold text-label-lg px-8 py-3.5 rounded-full hover:bg-[#7a4326] active:scale-[0.98] transition-all shadow-md"
          >
            Start for free
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 border border-[#d7c2b9] text-[#52443d] font-semibold text-label-lg px-8 py-3.5 rounded-full hover:bg-white hover:border-[#895032]/40 active:scale-[0.98] transition-all"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* ── App preview strip ── */}
      <section className="bg-[#ffb38e]/20 border-y border-[#d7c2b9]/30 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-4">
            {[
              { icon: "receipt_long", label: "Recipes", count: "100+" },
              { icon: "storefront", label: "Retailer integrations", count: "3" },
              { icon: "bolt", label: "Cart generation", count: "~5 sec" },
            ].map(({ icon, label, count }) => (
              <div key={label} className="bg-white rounded-2xl p-5 text-center shadow-[0_4px_20px_-4px_rgba(137,80,50,0.08)] border border-[#d7c2b9]/20">
                <span className="material-symbols-outlined text-[32px] text-[#895032]">{icon}</span>
                <p className="text-headline-sm font-black text-[#1a1c1a] mt-2">{count}</p>
                <p className="text-body-sm text-[#85736c] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-headline-md font-black text-[#1a1c1a]">Everything you need</h2>
          <p className="text-body-lg text-[#52443d] mt-3 max-w-lg mx-auto">
            Chef handles the busywork so you can focus on cooking.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="bg-white rounded-2xl p-6 border border-[#d7c2b9]/20 shadow-[0_4px_20px_-4px_rgba(137,80,50,0.06)] hover:shadow-[0_8px_32px_-4px_rgba(137,80,50,0.12)] transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-[#ffb38e]/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px] text-[#895032]">{icon}</span>
              </div>
              <h3 className="text-label-lg font-bold text-[#1a1c1a]">{title}</h3>
              <p className="text-body-sm text-[#52443d] mt-2 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-[#1a1c1a] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-headline-md font-black text-white">How it works</h2>
            <p className="text-body-lg text-white/60 mt-3">
              Three steps from hungry to cart.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col gap-4">
                <span className="text-[3rem] font-black text-[#ffb38e]/30 leading-none">{n}</span>
                <h3 className="text-headline-sm font-bold text-white">{title}</h3>
                <p className="text-body-md text-white/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="bg-[#ffb38e] rounded-3xl p-12 shadow-[0_8px_40px_-8px_rgba(137,80,50,0.25)]">
          <h2 className="text-headline-md font-black text-[#3d1e08]">
            Ready to ditch the grocery list?
          </h2>
          <p className="text-body-lg text-[#7a4326] mt-4 max-w-md mx-auto">
            Sign up free and generate your first grocery cart in under a minute.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 bg-[#895032] text-white font-semibold text-label-lg px-8 py-3.5 rounded-full hover:bg-[#7a4326] active:scale-[0.98] transition-all shadow-md"
          >
            Create free account
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#d7c2b9]/30 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-black text-[#ffb38e] text-lg">Chef</span>
          <p className="text-body-sm text-[#85736c]">
            &copy; {new Date().getFullYear()} Chef. Meal Execution Platform.
          </p>
          <div className="flex gap-6">
            <Link href="/login" className="text-body-sm text-[#85736c] hover:text-[#1a1c1a] transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="text-body-sm text-[#85736c] hover:text-[#1a1c1a] transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
