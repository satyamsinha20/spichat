import { useState } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* top gradient background */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 flex justify-center overflow-hidden">
        <div className="h-64 w-[60rem] bg-gradient-to-b from-indigo-600/40 via-indigo-500/10 to-transparent blur-3xl opacity-60" />
      </div>

      {/* NAVBAR */}
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          {/* logo + name */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold shadow-md">
              SP
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">
                spichat
              </span>
              <span className="hidden text-[10px] text-slate-400 sm:block">
                real-time social messaging
              </span>
            </div>
          </div>

          {/* desktop menu */}
          <div className="hidden items-center gap-6 text-[13px] sm:flex">
            <button
              onClick={() => scrollToSection("hero")}
              className="hover:text-indigo-400"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection("features")}
              className="hover:text-indigo-400"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="hover:text-indigo-400"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="hover:text-indigo-400"
            >
              Contact
            </button>

            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-full border border-slate-700 px-4 py-1.5 text-xs hover:border-indigo-500 hover:bg-slate-900"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-medium hover:bg-indigo-500"
              >
                Get started
              </Link>
            </div>
          </div>

          {/* mobile hamburger */}
          <button
            className="relative z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-xs sm:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </nav>

        {/* mobile menu */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-slate-800 bg-slate-950">
            <div className="space-y-1 px-4 py-3 text-sm">
              <button
                onClick={() => scrollToSection("hero")}
                className="block w-full rounded-md px-2 py-1 text-left hover:bg-slate-900"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection("features")}
                className="block w-full rounded-md px-2 py-1 text-left hover:bg-slate-900"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="block w-full rounded-md px-2 py-1 text-left hover:bg-slate-900"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className="block w-full rounded-md px-2 py-1 text-left hover:bg-slate-900"
              >
                Contact
              </button>

              <div className="mt-2 flex gap-2">
                <Link
                  to="/login"
                  className="flex-1 rounded-md border border-slate-700 px-3 py-1.5 text-center text-xs hover:border-indigo-500 hover:bg-slate-900"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex-1 rounded-md bg-indigo-600 px-3 py-1.5 text-center text-xs font-medium hover:bg-indigo-500"
                  onClick={() => setMobileOpen(false)}
                >
                  Get started
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10">
        {/* HERO */}
        <section
          id="hero"
          className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-12 md:flex-row md:py-16"
        >
          {/* left text */}
          <div className="w-full md:w-1/2">
            <span className="inline-flex items-center rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-[11px] font-medium text-indigo-200">
              ✨ Introducing spichat &nbsp;·&nbsp; real-time MERN chat
            </span>

            <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              Talk with your{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-purple-400 bg-clip-text text-transparent">
                friends
              </span>{" "}
              in real time.
            </h1>

            <p className="mt-4 max-w-xl text-sm text-slate-300 sm:text-[15px]">
              spichat is a modern real-time chat app built on MERN + Socket.IO.
              Add friends, see who&apos;s online, chat instantly with typing,
              seen status and more.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-medium hover:bg-indigo-500"
              >
                Get started for free
              </Link>
              <Link
                to="/login"
                className="text-sm text-slate-300 hover:text-indigo-400"
              >
                Already have an account?{" "}
                <span className="underline underline-offset-2">Login</span>
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-4 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Real-time messaging
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Online / offline status
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                Friend requests & dashboard
              </div>
            </div>
          </div>

          {/* right preview card */}
          <div className="w-full md:w-1/2">
            <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-indigo-900/30">
              <div className="mb-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 text-[11px] flex items-center justify-center">
                    U
                  </div>
                  <div>
                    <div className="text-[13px] font-medium">friend_username</div>
                    <div className="text-[10px] text-emerald-400">
                      ● Online · typing...
                    </div>
                  </div>
                </div>
                <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-300">
                  spichat preview
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-start">
                  <div className="max-w-[70%] rounded-2xl rounded-bl-sm bg-slate-800 px-3 py-2">
                    Hey 👋, welcome to{" "}
                    <span className="font-semibold text-indigo-300">
                      spichat
                    </span>
                    !
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-right">
                    Looks clean and modern 🔥
                    <div className="mt-1 text-[9px] text-indigo-100/80">
                      10:24 · ✓✓ seen
                    </div>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[65%] rounded-2xl rounded-bl-sm bg-slate-800 px-3 py-2">
                    Ready to build your chat app UI & backend.
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-[11px] text-slate-400">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs">
                  🙂
                </span>
                <span>Type a message...</span>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section
          id="features"
          className="border-t border-slate-800/60 bg-slate-950/60"
        >
          <div className="mx-auto max-w-6xl px-4 py-10">
            <h2 className="text-center text-xl font-semibold">
              Powerful features for modern conversations
            </h2>
            <p className="mt-2 text-center text-sm text-slate-400">
              All the essentials you need to chat in real time with your friends.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                title="Real-time messaging"
                icon="⚡"
                description="MERN + Socket.IO based live chat with typing indicators and online status."
              />
              <FeatureCard
                title="Friends & requests"
                icon="👥"
                description="Search users by username, send friend requests and manage your network."
              />
              <FeatureCard
                title="Seen & typing status"
                icon="👀"
                description="Know when your messages are seen and when the other person is typing."
              />
              <FeatureCard
                title="Clean dashboard"
                icon="📊"
                description="Modern dashboard view for home, friends and chat – optimized for mobile & desktop."
              />
              <FeatureCard
                title="Secure accounts"
                icon="🔒"
                description="Hashed passwords, JWT auth and protected routes keep user data safe."
              />
              <FeatureCard
                title="Built to extend"
                icon="🚀"
                description="Ready to add media, calls, themes and more features whenever you want."
              />
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section
          id="about"
          className="border-t border-slate-800/60 bg-slate-950/80"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:flex-row">
            <div className="md:w-1/2">
              <h2 className="text-xl font-semibold">About spichat</h2>
              <p className="mt-3 text-sm text-slate-300">
                spichat is a full-stack real-time chat application built on the
                MERN stack (MongoDB, Express, React, Node) with Socket.IO for
                instant messaging.
              </p>
              <p className="mt-3 text-sm text-slate-300">
                It&apos;s designed to feel familiar like WhatsApp or Messenger,
                but is fully customizable – perfect for learning, portfolio, or
                turning into your own product.
              </p>
            </div>

            <div className="md:w-1/2 space-y-3 text-sm text-slate-300">
              <h3 className="text-[15px] font-semibold">
                Tech stack highlights:
              </h3>
              <ul className="space-y-2 text-[13px]">
                <li>• React + Vite + Tailwind CSS for frontend UI</li>
                <li>• Node.js + Express backend with JWT authentication</li>
                <li>• MongoDB Atlas for cloud database</li>
                <li>• Socket.IO for real-time messaging & presence</li>
                <li>• Fully responsive layout for mobile and desktop</li>
              </ul>
              <Link
                to="/register"
                className="mt-3 inline-flex rounded-full bg-indigo-600 px-5 py-2 text-xs font-medium hover:bg-indigo-500"
              >
                Start using spichat
              </Link>
            </div>
          </div>
        </section>

        {/* CONTACT / CTA */}
        <section
          id="contact"
          className="border-t border-slate-800/60 bg-slate-950"
        >
          <div className="mx-auto max-w-4xl px-4 py-10">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 text-center">
              <h2 className="text-xl font-semibold">Ready to try spichat?</h2>
              <p className="mt-2 text-sm text-slate-300">
                Create your free account in seconds and start chatting with your
                friends in real time.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  to="/register"
                  className="rounded-full bg-indigo-600 px-6 py-2 text-sm font-medium hover:bg-indigo-500"
                >
                  Get started
                </Link>
                <Link
                  to="/login"
                  className="rounded-full border border-slate-700 px-6 py-2 text-sm hover:border-indigo-500 hover:bg-slate-900"
                >
                  Login
                </Link>
              </div>

              <p className="mt-6 text-[11px] text-slate-500">
                For feedback or ideas, you can extend the contact section later
                with a form or links.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950/90">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} spichat. All rights reserved.</span>
          <span>Built with MERN · Tailwind · Socket.IO</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description, icon }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-slate-900/40">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-sm">
          {icon}
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-[12px] text-slate-300">{description}</p>
    </div>
  );
}
