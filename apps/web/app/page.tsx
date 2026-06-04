import Link from "next/link";
import { currentUser } from "@/lib/session";

export default async function HomePage() {
  const user = await currentUser();
  return (
    <main className="min-h-screen bg-[#eef2ef]">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-coral">StreamFusion</p>
          <h1 className="text-5xl font-semibold leading-tight text-ink">Unified live chat overlays for Twitch, Kick, and X.</h1>
          <p className="mt-5 max-w-2xl text-lg text-steel">
            Create OBS browser-source overlays, connect streaming accounts, and receive normalized realtime chat messages through one production-ready control plane.
          </p>
          <div className="mt-8 flex gap-3">
            <Link className="btn" href={user ? "/dashboard" : "/register"}>{user ? "Open dashboard" : "Create account"}</Link>
            <Link className="btn-secondary" href="/login">Sign in</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
