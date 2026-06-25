import Image from "next/image";
import Link from "next/link";
import { Manrope } from "next/font/google";
import { SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const painPoints = [
  {
    icon: "bookmarks",
    iconClass: "bg-[#ffdad6] text-[#ba1a1a]",
    title: "Recipes everywhere",
    desc: "TikTok, Instagram saves, random notes. Finding that one chicken recipe takes 15 minutes.",
  },
  {
    icon: "kitchen",
    iconClass: "bg-[#ffb689]/30 text-[#984800]",
    title: "Fuzzy pantry",
    desc: "Standing in the grocery aisle wondering if you have soy sauce at home (you have three).",
  },
  {
    icon: "calculate",
    iconClass: "bg-[#f3bd6a]/30 text-[#2e1c00]",
    title: "Grocery math homework",
    desc: 'Translating "1/2 cup" into "how many onions do I actually buy?"',
  },
  {
    icon: "restaurant",
    iconClass: "bg-[#bdebee] text-[#073b3e]",
    title: "Stressful solo cooking",
    desc: "Hands covered in raw meat while trying to scroll back up to step 2 on a tiny phone screen.",
  },
];

const benefits = [
  {
    icon: "bolt",
    title: "Turn a screenshot into dinner",
    desc: "Turn food inspiration into a practical recipe and shopping plan.",
  },
  {
    icon: "inventory_2",
    title: "Stop buying ingredients you already have",
    desc: "Preppie uses pantry context so you can reduce duplicate buys.",
  },
  {
    icon: "calendar_today",
    title: "Make cooking work around your actual week",
    desc: "Flexible planning that accounts for late nights, social plans, and changing energy levels.",
  },
  {
    icon: "group",
    title: "Cook with roommates, partners, or by yourself without chaos",
    desc: "Share plans, divide shopping, and coordinate who is making what.",
  },
  {
    icon: "verified",
    title: "Feel more confident every time you cook",
    desc: "Step-by-step guidance and AI support help you learn without the stress.",
  },
];

const faqs = [
  {
    question: "I barely know how to boil water. Will this help me?",
    answer:
      "Yes. Set your skill level to beginner and Preppie keeps the plan practical, explains steps, and helps when recipe language gets confusing.",
  },
  {
    question: "Can I import recipes from anywhere?",
    answer:
      "Preppie supports reviewable recipe capture from text and URLs, with image and social-inspired capture paths evolving carefully.",
  },
  {
    question: "How does the pantry tracking work?",
    answer:
      "Pantry context is editable guidance, not perfect accounting. It helps Preppie reduce duplicate buys and suggest what you can cook with what you have.",
  },
];

function MaterialIcon({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden>
      {children}
    </span>
  );
}

function PrimaryCta({
  children = "Start planning free",
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href="/signup"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#f4790d] px-8 py-4 text-[16px] font-semibold text-white shadow-lg shadow-[#f4790d]/20 transition-all duration-200 hover:bg-[#d66a0a] active:scale-95 ${className}`}
    >
      {children}
      <MaterialIcon className="text-sm">arrow_forward</MaterialIcon>
    </Link>
  );
}

function SecondaryCta({ className = "" }: { className?: string }) {
  return (
    <a
      href="#how-it-works"
      className={`inline-flex items-center justify-center rounded-full border-2 border-[#073b3e] px-8 py-4 text-[16px] font-semibold text-[#073b3e] transition-all duration-200 hover:bg-[#073b3e]/5 active:scale-95 ${className}`}
    >
      See how it works
    </a>
  );
}

function HeroScreens() {
  return (
    <div className="relative hidden h-[600px] w-full [perspective:1000px] lg:block">
      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c0dedf]/30 opacity-60 blur-3xl" />

      <div className="absolute left-0 top-10 z-10 flex h-[520px] w-[260px] -rotate-6 scale-90 flex-col overflow-hidden rounded-[32px] border-[4px] border-[#f4ede4] bg-white shadow-[0_8px_30px_rgba(7,59,62,0.08)]">
        <div className="relative h-48 bg-[#e8e2d9]">
          <Image
            src="/images/spagghetti.png"
            alt=""
            fill
            sizes="260px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <h3 className="text-lg font-bold leading-tight text-white">
              Creamy Tomato Pasta
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs opacity-90">
              <MaterialIcon className="text-[12px]">schedule</MaterialIcon>
              25 mins
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex gap-2">
            <span className="rounded-md bg-[#c0dedf]/40 px-2 py-1 text-[10px] font-bold text-[#073b3e]">
              Quick Prep
            </span>
            <span className="rounded-md bg-[#c0dedf]/40 px-2 py-1 text-[10px] font-bold text-[#073b3e]">
              Vegetarian
            </span>
          </div>
          <p className="mt-1 text-xs text-[#404849]">
            A comforting weeknight staple that comes together faster than
            delivery.
          </p>
          <div className="mt-auto">
            <button className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f4790d] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#d66a0a]">
              <MaterialIcon className="text-[16px]">add</MaterialIcon>
              Add to this week
            </button>
          </div>
        </div>
      </div>

      <div className="absolute right-0 top-20 z-10 flex h-[520px] w-[260px] rotate-6 scale-90 flex-col overflow-hidden rounded-[32px] border-[4px] border-[#f4ede4] bg-white p-4 shadow-[0_8px_30px_rgba(7,59,62,0.08)]">
        <div className="mb-4 mt-2 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#073b3e]">Pantry Check</h3>
          <MaterialIcon className="text-[#073b3e]">kitchen</MaterialIcon>
        </div>
        <div className="mb-4 rounded-xl border border-[#c0dedf]/50 bg-[#fff8ef] p-3">
          <p className="mb-1 text-xs font-medium text-[#404849]">
            Creamy Tomato Pasta
          </p>
          <div className="flex items-end justify-between">
            <p className="text-sm font-bold text-[#073b3e]">
              4 of 7 ingredients
            </p>
            <div className="mb-1 flex gap-1">
              <div className="h-1.5 w-8 rounded-full bg-[#073b3e]" />
              <div className="h-1.5 w-2 rounded-full bg-[#073b3e]" />
              <div className="h-1.5 w-2 rounded-full bg-[#e8e2d9]" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-hidden">
          <div className="flex items-center gap-3 opacity-60">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#073b3e]">
              <MaterialIcon className="text-[12px] text-white">
                check
              </MaterialIcon>
            </div>
            <span className="text-sm text-[#404849] line-through">
              Pasta (Penne)
            </span>
          </div>
          {["Heavy Cream", "Fresh Basil"].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#c0c8c8]" />
              <span className="text-sm font-semibold text-[#f4790d]">
                {item}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-auto border-t border-[#e8e2d9]/50 pt-4">
          <button className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#073b3e] py-2.5 text-sm font-bold text-[#073b3e] transition-colors hover:bg-[#073b3e]/5">
            <MaterialIcon className="text-[16px]">shopping_cart</MaterialIcon>
            Add missing to list
          </button>
        </div>
      </div>

      <div className="absolute left-1/2 top-0 z-20 flex h-[560px] w-[280px] -translate-x-1/2 flex-col overflow-hidden rounded-[36px] border-[6px] border-[#f4ede4] bg-white p-5 shadow-[0_12px_40px_rgba(7,59,62,0.12)]">
        <div className="mb-6 mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MaterialIcon className="text-[#073b3e]">arrow_back</MaterialIcon>
            <span className="text-xs font-bold uppercase tracking-wider text-[#073b3e]">
              Step 3 of 6
            </span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4be6b]/30 shadow-sm">
            <Image
              src="/android-chrome-192x192.png"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 rounded-full object-cover"
            />
          </div>
        </div>
        <h3 className="mb-4 text-xl font-bold leading-tight text-[#1e1b16]">
          Simmer the sauce until slightly thickened.
        </h3>
        <div className="mb-4 flex flex-col items-center justify-center rounded-2xl border border-[#c0dedf]/50 bg-[#fff8ef] p-4 py-6">
          <span className="mb-3 text-4xl font-light text-[#073b3e]">08:00</span>
          <button className="flex items-center gap-1 rounded-full bg-[#f4be6b] px-5 py-2 text-xs font-bold text-[#1e1b16] shadow-sm transition-transform hover:scale-105">
            <MaterialIcon className="text-[16px]">play_arrow</MaterialIcon>
            Start Timer
          </button>
        </div>
        <p className="text-sm leading-relaxed text-[#404849]">
          Reduce heat to medium-low. Stir occasionally so the bottom does not
          catch.
        </p>
        <div className="mt-auto">
          <div className="group relative cursor-pointer rounded-2xl bg-[#073b3e] p-3.5 text-white shadow-md transition-colors hover:bg-[#0a4d52]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-white/20 p-2">
                <MaterialIcon className="text-[16px] text-white">
                  mic
                </MaterialIcon>
              </div>
              <div>
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#c0dedf]">
                  Ask Preppie
                </p>
                <p className="text-sm font-semibold">
                  What can I use instead of cream?
                </p>
              </div>
            </div>
            <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border border-white bg-[#f4790d]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportRecipeMock() {
  return (
    <div className="w-full max-w-[240px] rounded-2xl border border-[#c0dedf]/50 bg-white p-4 text-left shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <MaterialIcon className="text-[18px] text-[#073b3e]">
          add_link
        </MaterialIcon>
        <span className="text-xs font-bold text-[#073b3e]">Import Recipe</span>
      </div>
      <div className="mb-2 truncate rounded-lg border border-[#e8e2d9] bg-[#e8e2d9]/30 p-2 text-[11px] text-[#404849]">
        https://tiktok.com/@chef/video...
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#c0dedf]/30">
        <div className="h-full w-3/4 rounded-full bg-[#073b3e]" />
      </div>
      <p className="mt-2 text-center text-[10px] font-semibold text-[#073b3e]">
        Extracting ingredients...
      </p>
    </div>
  );
}

function SmartListMock() {
  return (
    <div className="w-full max-w-[240px] rounded-2xl border border-[#c0dedf]/50 bg-white p-4 text-left shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <MaterialIcon className="text-[18px] text-[#073b3e]">
          kitchen
        </MaterialIcon>
        <span className="text-xs font-bold text-[#073b3e]">Smart List</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded bg-[#e8e2d9]/20 p-1.5">
          <span className="text-[11px] text-[#404849] line-through">
            Olive oil
          </span>
          <span className="rounded bg-[#c0dedf]/30 px-1.5 py-0.5 text-[9px] text-[#073b3e]">
            In Pantry
          </span>
        </div>
        <div className="flex items-center justify-between rounded border border-[#f4790d]/20 bg-[#f4790d]/10 p-1.5">
          <span className="text-[11px] font-semibold text-[#f4790d]">
            Fresh Basil
          </span>
          <span className="rounded bg-[#f4790d] px-1.5 py-0.5 text-[9px] text-white">
            To Buy
          </span>
        </div>
      </div>
    </div>
  );
}

function AssistantMock() {
  return (
    <div className="relative w-full max-w-[240px] overflow-hidden rounded-2xl border border-[#c0dedf]/50 bg-white p-4 text-left shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Image
          src="/android-chrome-192x192.png"
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] rounded-full"
        />
        <span className="text-xs font-bold text-[#073b3e]">
          Assistant Active
        </span>
      </div>
      <p className="mb-3 text-[11px] text-[#404849]">
        I started a 10 minute timer for the pasta. While that boils, chop the
        garlic.
      </p>
      <div className="flex gap-2">
        <div className="flex items-center gap-1 rounded bg-[#e8e2d9]/30 px-2 py-1 text-[10px] font-medium">
          <MaterialIcon className="text-[12px]">mic</MaterialIcon>
          Next step
        </div>
      </div>
    </div>
  );
}

function WorkflowStep({
  step,
  icon,
  title,
  desc,
  active = false,
  children,
}: {
  step: string;
  icon: string;
  title: string;
  desc: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8 flex flex-col items-center text-center md:mt-0">
      <div
        className={`relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#c0dedf] shadow-md ${
          active ? "bg-[#073b3e] text-white" : "bg-white text-[#073b3e]"
        } text-xl font-bold`}
      >
        {step}
        <div
          className={`absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full ${
            active ? "bg-[#f4be6b] text-[#073b3e]" : "bg-[#f4790d] text-white"
          }`}
        >
          <MaterialIcon className="text-[14px]">{icon}</MaterialIcon>
        </div>
      </div>
      <h3 className="mb-3 text-xl font-bold text-[#073b3e]">{title}</h3>
      <p className="mb-6 px-4 text-sm text-[#404849]">{desc}</p>
      {children}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  children,
}: {
  icon: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[#c0dedf]/30 bg-[#fff8ef] p-6 transition-all hover:shadow-[0_8px_30px_rgba(7,59,62,0.08)]">
      <MaterialIcon className="mb-4 block text-3xl text-[#f4790d]">
        {icon}
      </MaterialIcon>
      <h3 className="mb-2 text-xl font-bold text-[#073b3e]">{title}</h3>
      <p className="mb-6 text-sm text-[#404849]">{desc}</p>
      {children}
    </div>
  );
}

export default function LandingPage() {
  return (
    <main
      className={`${manrope.className} min-h-screen overflow-x-hidden bg-[#fff8ef] text-[#1e1b16] antialiased`}
    >
      <header
        id="main-nav"
        className="sticky top-0 z-50 border-b border-[#e8e2d9]/20 bg-[#fff8ef]/90 backdrop-blur-md transition-all duration-300"
      >
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-3">
          <Link href="/" className="group flex items-center gap-2">
            <Image
              src="/android-chrome-192x192.png"
              alt=""
              width={32}
              height={32}
              priority
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="text-[24px] font-extrabold tracking-tight text-[#002426] transition-colors group-hover:text-[#f4790d]">
              Preppie
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              className="text-sm font-semibold tracking-[0.01em] text-[#404849] transition-colors duration-200 hover:text-[#984800]"
              href="#how-it-works"
            >
              How it works
            </a>
            <a
              className="text-sm font-semibold tracking-[0.01em] text-[#404849] transition-colors duration-200 hover:text-[#984800]"
              href="#features"
            >
              Features
            </a>
            <a
              className="text-sm font-semibold tracking-[0.01em] text-[#404849] transition-colors duration-200 hover:text-[#984800]"
              href="#campus-beta"
            >
              Why Preppie
            </a>
            <a
              className="text-sm font-semibold tracking-[0.01em] text-[#404849] transition-colors duration-200 hover:text-[#984800]"
              href="#faq"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden text-sm font-semibold text-[#1e1b16] transition-colors hover:text-[#f4790d] sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#f4790d] px-6 py-2.5 text-sm font-semibold tracking-[0.01em] text-white shadow-sm transition-all duration-150 hover:bg-[#d66a0a] active:scale-95"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden pb-20 pt-16">
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 lg:grid-cols-2">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c0dedf]/50 bg-[#c0dedf]/30 px-3 py-1.5">
              <MaterialIcon className="text-sm text-[#073b3e]">
                auto_awesome
              </MaterialIcon>
              <span className="text-xs font-bold uppercase tracking-wider text-[#073b3e]">
                Your AI Sous Chef
              </span>
            </div>

            <h1 className="mb-6 whitespace-pre-line text-[44px] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#1e1b16] sm:text-[56px]">
              Plan what to eat.{"\n"}
              <span className="relative inline-block text-[#f4790d]">
                Shop what you need.
                <svg
                  className="absolute -bottom-1 left-0 -z-10 h-3 w-full text-[#f4be6b] opacity-70"
                  fill="none"
                  viewBox="0 0 200 9"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2.00035 7.15178C49.9876 -0.198218 135.539 -2.01529 198.053 6.64332"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="4"
                  />
                </svg>
              </span>
              {"\n"}Cook with backup.
            </h1>

            <p className="mb-10 max-w-lg text-lg leading-relaxed text-[#404849]">
              Preppie is your personalized AI sous chef for everyday cooking.
              Turn food ideas, pantry context, grocery needs, and kitchen
              questions into one simple routine.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <PrimaryCta />
              <SecondaryCta />
            </div>
          </div>

          <HeroScreens />
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-y border-[#e8e2d9]/30 bg-white py-20"
      >
        <div className="mx-auto mb-16 max-w-[1280px] px-6 text-center">
          <h2 className="mb-4 text-[32px] font-bold leading-tight text-[#073b3e] md:text-[56px]">
            Cooking gets hard before the pan heats up.
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[#404849]">
            The actual cooking is not the problem. It is the mental gymnastics
            required to get there.
          </p>
        </div>

        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {painPoints.map((point) => (
              <div
                key={point.title}
                className="rounded-3xl border border-[#c0dedf]/30 bg-[#fff8ef] p-6 transition-shadow hover:shadow-[0_8px_30px_rgba(7,59,62,0.08)]"
              >
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${point.iconClass}`}
                >
                  <MaterialIcon className="text-2xl">{point.icon}</MaterialIcon>
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#1e1b16]">
                  {point.title}
                </h3>
                <p className="text-sm text-[#404849]">{point.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fff8ef] py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-3 text-[32px] font-bold leading-tight text-[#073b3e] md:text-[48px]">
              One cooking loop.
              <br />
              Less mental load.
            </h2>
            <p className="mx-auto max-w-2xl text-[#404849]">
              Preppie connects food inspiration, pantry context, grocery
              support, and cooking help into one calm routine.
            </p>
          </div>

          <div className="relative grid gap-8 md:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-8 hidden border-t border-dashed border-[#c0c8c8] md:block" />
            <WorkflowStep
              step="1"
              icon="link"
              title="Plan effortlessly"
              desc='Paste any link, upload a screenshot, or just say "I have chicken and rice."'
            >
              <ImportRecipeMock />
            </WorkflowStep>
            <WorkflowStep
              step="2"
              icon="shopping_basket"
              title="Shop smartly"
              desc="Preppie checks your pantry context and only adds what you actually need to buy."
            >
              <SmartListMock />
            </WorkflowStep>
            <WorkflowStep
              step="3"
              icon="restaurant"
              title="Cook calmly"
              desc="Step-by-step guidance that moves at your pace, hands-free when you need it."
              active
            >
              <AssistantMock />
            </WorkflowStep>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-24">
        <div className="mx-auto mb-16 max-w-[1280px] px-6">
          <h2 className="mb-4 text-center text-[32px] font-bold leading-tight text-[#073b3e] md:text-[48px]">
            Built for real kitchens.
          </h2>
          <p className="mx-auto max-w-2xl text-center text-lg leading-relaxed text-[#404849]">
            Preppie helps turn a food idea into a realistic plan, even when your
            week is busy, your kitchen is small, and your energy is low.
          </p>
        </div>

        <div className="mx-auto grid max-w-[1280px] gap-6 px-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon="tune"
            title="Personalized setup"
            desc="Tell Preppie your budget, dietary needs, and skill level for tailored recommendations."
          >
            <div className="flex flex-wrap gap-2 rounded-xl border border-[#c0dedf]/20 bg-white p-3 text-[11px] font-medium">
              {["Budget: Under $50/wk", "Dairy-free", "Beginner"].map(
                (chip) => (
                  <span
                    key={chip}
                    className="rounded-md bg-[#e8e2d9]/40 px-2 py-1"
                  >
                    {chip}
                  </span>
                ),
              )}
            </div>
          </FeatureCard>

          <FeatureCard
            icon="bookmark_add"
            title="Save inspiration"
            desc="Drop links or notes. Preppie turns messy inspiration into a reviewable recipe draft."
          >
            <div className="flex gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white"
                aria-label="TikTok"
                title="TikTok"
              >
                <SiTiktok className="h-4 w-4" aria-hidden />
              </div>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white"
                aria-label="Instagram"
                title="Instagram"
              >
                <SiInstagram className="h-4 w-4" aria-hidden />
              </div>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff0000] text-white"
                aria-label="YouTube"
                title="YouTube"
              >
                <SiYoutube className="h-4 w-4" aria-hidden />
              </div>
            </div>
          </FeatureCard>

          <FeatureCard
            icon="kitchen"
            title="Pantry context"
            desc='Keep rough track of staples and ask "what can I make with these things?"'
          >
            <div className="rounded-xl border border-[#c0dedf]/20 bg-white p-3">
              <p className="mb-1 text-[12px] font-semibold text-[#073b3e]">
                In your pantry:
              </p>
              <p className="text-[11px] text-[#404849]">
                Rice, Soy Sauce, Eggs, Onion...
              </p>
            </div>
          </FeatureCard>

          <FeatureCard
            icon="calendar_month"
            title="Meal planning"
            desc="Drag and drop meals into your week. Preppie keeps prep time and ingredient overlaps in mind."
          >
            <div className="flex gap-2 text-center text-[10px] font-semibold">
              {[
                ["MON", "bg-[#073b3e]"],
                ["TUE", "bg-[#f4790d]"],
                ["WED", "bg-[#073b3e]"],
              ].map(([day, dot]) => (
                <div
                  key={day}
                  className="flex-1 rounded-lg border border-[#c0dedf]/30 bg-white p-2"
                >
                  <div className="mb-1 text-[#404849]">{day}</div>
                  <div className={`mx-auto h-2 w-2 rounded-full ${dot}`} />
                </div>
              ))}
            </div>
          </FeatureCard>

          <FeatureCard
            icon="shopping_cart"
            title="Grocery support"
            desc="Auto-generated lists categorized by aisle. Grocery math done across multiple recipes."
          >
            <div className="rounded-xl border border-[#c0dedf]/20 bg-white p-3 text-[11px]">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm border border-[#707979]" />
                Produce (3)
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm border border-[#707979]" />
                Dairy (1)
              </div>
            </div>
          </FeatureCard>

          <FeatureCard
            icon="record_voice_over"
            title="Hands-free cooking"
            desc="Voice commands to read the next step, start timers, or ask for substitutions on the fly."
          >
            <div className="flex items-center gap-2 rounded-xl bg-[#073b3e] p-3 text-[11px] text-white">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                <MaterialIcon className="text-[14px]">mic</MaterialIcon>
              </div>
              <span>Hey Preppie, start a 5 min timer</span>
            </div>
          </FeatureCard>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#fff8ef] py-24">
        <div className="absolute right-0 top-0 -z-10 h-full w-1/2 rounded-l-[100px] bg-[#c0dedf]/20" />
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 md:grid-cols-2">
          <div>
            <h2 className="mb-6 text-[32px] font-bold leading-tight text-[#073b3e] md:text-[48px]">
              For the nights when takeout feels easier.
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-[#404849]">
              We know the feeling. You are hungry, tired, and staring into a
              fridge of random ingredients. Preppie is designed to lower the
              barrier to entry for cooking at home.
            </p>
            <ul className="space-y-6">
              {benefits.map((benefit) => (
                <li key={benefit.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c0dedf] bg-white text-[#f4790d]">
                    <MaterialIcon>{benefit.icon}</MaterialIcon>
                  </div>
                  <div>
                    <h4 className="mb-1 text-lg font-bold text-[#073b3e]">
                      {benefit.title}
                    </h4>
                    <p className="text-sm text-[#404849]">{benefit.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="relative h-[500px] w-full overflow-hidden rounded-[32px] shadow-[0_12px_40px_rgba(7,59,62,0.12)]">
              <Image
                src="/images/preppie-dinner-illustration.png"
                alt="Students cooking together"
                fill
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover object-center"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 max-w-[220px] rounded-2xl border border-[#c0dedf] bg-white p-5 shadow-lg">
              <p className="mb-2 text-sm font-bold text-[#073b3e]">
                Saved me money this week by actually using what I had.
              </p>
              <p className="text-xs text-[#404849]">
                Daya, 22, Senior in College
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="campus-beta"
        className="border-y border-[#e8e2d9]/30 bg-white py-24"
      >
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#f4be6b]/20 px-4 py-2 text-sm font-bold text-[#f4790d]">
            <MaterialIcon className="text-[18px]">check_circle</MaterialIcon>
            NOW AVAILABLE
          </div>
          <h2 className="mb-6 text-[32px] font-bold leading-tight text-[#073b3e] md:text-[48px]">
            Built for real life.
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[#404849]">
            Preppie is designed for busy weeks, small kitchens, shared grocery
            runs, changing routines, and the moments when cooking sounds good
            but figuring everything out does not.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <PrimaryCta className="shadow-md" />
            <SecondaryCta className="border border-[#c0dedf] bg-[#fff8ef]" />
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#fff8ef] py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-12 text-center text-[32px] font-bold leading-tight text-[#073b3e] md:text-[40px]">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-2xl border border-[#c0dedf]/30 bg-white p-6 shadow-sm"
              >
                <h3 className="mb-2 text-lg font-bold text-[#073b3e]">
                  {faq.question}
                </h3>
                <p className="text-sm text-[#404849]">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#073b3e] px-6 py-24 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15),transparent_48%)] opacity-70" />
        <div className="relative z-10 mx-auto max-w-2xl">
          <h2 className="mb-6 text-[34px] font-bold leading-tight text-white md:text-[56px]">
            Make cooking feel possible this week.
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-[#c0dedf]">
            Stop stressing over dinner. Let your AI sous chef handle the
            details.
          </p>
          <PrimaryCta className="px-10 py-5 text-[18px]" />
        </div>
      </section>

      <footer className="border-t border-[#e8e2d9]/20 bg-[#fff8ef]">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center justify-between gap-6 px-6 py-12 md:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#073b3e]">Preppie</span>
          </Link>
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            {["Privacy", "Terms", "Support", "Contact"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-sm font-semibold text-[#404849] transition-colors hover:text-[#f4790d]"
              >
                {link}
              </a>
            ))}
          </nav>
          <div className="text-sm font-semibold text-[#404849] opacity-80">
            © 2026 Preppie AI. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
