import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false); // navbar mobile menu

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginUser(form);
      const { token, ...userData } = data;
      login(userData, token);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* NAVBAR (same style as Home) */}
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          {/* logo + name */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold shadow-md">
              sP
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">
                sPichat
              </span>
              <span className="hidden text-[10px] text-slate-400 sm:block">
                real-time social messaging
              </span>
            </div>
          </div>

          {/* desktop menu */}
          <div className="hidden items-center gap-6 text-[13px] sm:flex">
            <Link to="/" className="hover:text-indigo-400">
              Home
            </Link>
            <a href="/#features" className="hover:text-indigo-400">
              Features
            </a>
            <a href="/#about" className="hover:text-indigo-400">
              About
            </a>
            <a href="/#contact" className="hover:text-indigo-400">
              Contact
            </a>

            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-full border border-indigo-500 bg-indigo-600/10 px-4 py-1.5 text-xs font-medium text-indigo-200"
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
              <Link
                to="/"
                className="block w-full rounded-md px-2 py-1 text-left hover:bg-slate-900"
                onClick={() => setMobileOpen(false)}
              >
                Home
              </Link>
              <a
                href="/#features"
                className="block w-full rounded-md px-2 py-1 text-left hover:bg-slate-900"
                onClick={() => setMobileOpen(false)}
              >
                Features
              </a>
              <a
                href="/#about"
                className="block w-full rounded-md px-2 py-1 text-left hover:bg-slate-900"
                onClick={() => setMobileOpen(false)}
              >
                About
              </a>
              <a
                href="/#contact"
                className="block w-full rounded-md px-2 py-1 text-left hover:bg-slate-900"
                onClick={() => setMobileOpen(false)}
              >
                Contact
              </a>

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

      {/* MAIN: login card */}
      <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-slate-900 rounded-2xl shadow-lg p-8 border border-slate-800/80">
          <h1 className="text-2xl font-semibold mb-1 text-center">
            Welcome back 👋
          </h1>
          <p className="text-sm text-slate-400 mb-6 text-center">
            Login to your spichat account
          </p>

          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-700 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                name="email"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Password</label>
              <input
                type="password"
                name="password"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full mt-2 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-4 text-xs text-center text-slate-400">
            New here?{" "}
            <Link to="/register" className="text-indigo-400 hover:underline">
              Create an account
            </Link>
          </p>

          <p className="mt-2 text-[11px] text-center text-slate-500">
            or{" "}
            <Link to="/" className="underline underline-offset-2">
              go back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
