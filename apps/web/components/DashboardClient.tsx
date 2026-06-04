"use client";

import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { Copy, KeyRound, Link2, MessageSquareText, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

type Overlay = {
  id: string;
  name: string;
  theme: string;
  fontSize: number;
  fontFamily: string;
  backgroundOpacity: number;
  animationStyle: string;
  platformBadges: boolean;
  messageLifetime: number;
  profanityFilter: boolean;
};

type Account = { id: string; provider: string; displayName: string; username: string };
type Metrics = { users: number; overlays: number; connectedAccounts: number; chatMessages: number } | null;

export function DashboardClient({ user, overlays, accounts, metrics }: { user: { name?: string | null; email?: string | null }; overlays: Overlay[]; accounts: Account[]; metrics: Metrics }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [mockStatus, setMockStatus] = useState("");
  const oauthStatus = searchParams.get("oauth");

  async function createOverlay(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const res = await fetch("/api/overlays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, platformBadges: payload.platformBadges === "on", profanityFilter: payload.profanityFilter === "on" })
    });
    const data = await res.json();
    if (data.url) setGeneratedUrl(data.url);
    router.refresh();
  }

  async function regenerate(id: string) {
    const res = await fetch(`/api/overlays/${id}/token`, { method: "POST" });
    const data = await res.json();
    setGeneratedUrl(data.url);
  }

  async function remove(id: string) {
    await fetch(`/api/overlays/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function updateProfile(formData: FormData) {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formData.get("name") })
    });
    router.refresh();
  }

  async function sendMockChat(formData: FormData) {
    setMockStatus("");
    const overlayId = String(formData.get("overlayId") || "");
    if (!overlayId) {
      setMockStatus("Create an overlay first.");
      return;
    }
    const res = await fetch("/api/mock-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        overlayId,
        platform: formData.get("platform"),
        displayName: formData.get("displayName"),
        username: formData.get("username"),
        message: formData.get("message"),
        badges: String(formData.get("badge") || "").trim() ? [String(formData.get("badge"))] : []
      })
    });
    const data = await res.json();
    setMockStatus(res.ok ? (data.delivered ? "Sent to the live overlay." : "Saved. Open the overlay URL to receive realtime messages.") : "Could not send mock chat.");
  }

  return (
    <main className="min-h-screen bg-[#f4f6f4]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-semibold">StreamFusion</p>
            <p className="text-sm text-steel">{user.email}</p>
          </div>
          <button className="btn-secondary" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="font-semibold">Profile</h2>
            <form action={updateProfile} className="mt-4 space-y-3">
              <input className="field" name="name" defaultValue={user.name || ""} placeholder="Display name" />
              <button className="btn-secondary w-full">Save profile</button>
            </form>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="font-semibold">Connected platforms</h2>
            {oauthStatus && <p className="mt-3 rounded-md bg-neutral-100 p-3 text-sm text-steel">{oauthMessage(oauthStatus)}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a className="btn-secondary" href="/api/oauth/twitch/connect">Twitch</a>
              <a className="btn-secondary" href="/api/oauth/kick/connect">Kick</a>
            </div>
            <div className="mt-4 space-y-2">
              {accounts.length === 0 && <p className="text-sm text-steel">No external accounts connected. Mock chat is active for development.</p>}
              {accounts.map((account) => (
                <div key={account.id} className="rounded-md border border-neutral-200 p-3 text-sm">
                  <strong>{account.provider}</strong> {account.displayName} <span className="text-steel">@{account.username}</span>
                </div>
              ))}
            </div>
          </section>

          {metrics && (
            <section className="rounded-lg border border-neutral-200 bg-white p-5">
              <h2 className="font-semibold">Admin metrics</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Metric label="Users" value={metrics.users} />
                <Metric label="Overlays" value={metrics.overlays} />
                <Metric label="Accounts" value={metrics.connectedAccounts} />
                <Metric label="Messages" value={metrics.chatMessages} />
              </div>
            </section>
          )}
        </aside>

        <section className="space-y-6">
          <form action={sendMockChat} className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <MessageSquareText size={18} />
              <h2 className="font-semibold">Test mock chat</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select className="field" name="overlayId" defaultValue={overlays[0]?.id || ""} required>
                {overlays.length === 0 && <option value="">No overlays yet</option>}
                {overlays.map((overlay) => <option key={overlay.id} value={overlay.id}>{overlay.name}</option>)}
              </select>
              <select className="field" name="platform" defaultValue="MOCK"><option>MOCK</option><option>TWITCH</option><option>KICK</option><option>X</option></select>
              <input className="field" name="displayName" defaultValue="Mock Viewer" />
              <input className="field" name="username" defaultValue="mock_viewer" />
              <input className="field" name="badge" placeholder="Badge, optional" />
              <input className="field md:col-span-2" name="message" defaultValue="This is a StreamFusion mock chat test." maxLength={500} required />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button className="btn" disabled={overlays.length === 0}>Send test message</button>
              {mockStatus && <p className="text-sm text-steel">{mockStatus}</p>}
            </div>
          </form>

          <form action={createOverlay} className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Plus size={18} />
              <h2 className="font-semibold">Create overlay</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="field" name="name" placeholder="Overlay name" required />
              <select className="field" name="theme" defaultValue="DARK"><option>DARK</option><option>LIGHT</option><option>NEON</option><option>MINIMAL</option></select>
              <input className="field" name="fontSize" type="number" min="12" max="64" defaultValue="22" />
              <input className="field" name="fontFamily" defaultValue="Inter, Arial, sans-serif" />
              <input className="field" name="backgroundOpacity" type="number" min="0" max="1" step="0.05" defaultValue="0.65" />
              <select className="field" name="animationStyle" defaultValue="FADE"><option>NONE</option><option>FADE</option><option>SLIDE</option><option>POP</option></select>
              <input className="field" name="messageLifetime" type="number" min="3" max="120" defaultValue="18" />
              <label className="flex items-center gap-2 text-sm"><input name="platformBadges" type="checkbox" defaultChecked /> Platform badges</label>
              <label className="flex items-center gap-2 text-sm"><input name="profanityFilter" type="checkbox" defaultChecked /> Profanity filter</label>
            </div>
            <button className="btn mt-4">Create OBS URL</button>
          </form>

          {generatedUrl && (
            <div className="rounded-lg border border-mint bg-white p-5">
              <div className="flex items-center gap-2 font-semibold"><Link2 size={18} /> Private OBS URL</div>
              <p className="mt-3 break-all rounded-md bg-neutral-100 p-3 text-sm">{generatedUrl}</p>
              <button className="btn-secondary mt-3" onClick={() => navigator.clipboard.writeText(generatedUrl)}><Copy size={16} /> Copy</button>
            </div>
          )}

          <div className="grid gap-4">
            {overlays.map((overlay) => (
              <article key={overlay.id} className="rounded-lg border border-neutral-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{overlay.name}</h3>
                    <p className="text-sm text-steel">{overlay.theme} / {overlay.animationStyle} / {overlay.fontSize}px</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary" onClick={() => regenerate(overlay.id)}><KeyRound size={16} /> Regenerate</button>
                    <button className="btn-secondary" onClick={() => remove(overlay.id)}><Trash2 size={16} /> Delete</button>
                  </div>
                </div>
              </article>
            ))}
            {overlays.length === 0 && <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-steel"><RefreshCw className="mx-auto mb-3" /> Create your first overlay to get an OBS browser-source URL.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md bg-neutral-100 p-3"><p className="text-steel">{label}</p><p className="text-xl font-semibold">{value}</p></div>;
}

function oauthMessage(status: string): string {
  if (status === "connected") return "Provider account connected.";
  if (status === "invalid") return "OAuth response was invalid. Try connecting again.";
  if (status === "unsupported") return "That provider is not supported yet.";
  if (status.endsWith("-not-configured")) return `${status.split("-")[0]} OAuth is not configured. Add the client ID, client secret, and redirect URI in your environment, then restart the app.`;
  if (status.endsWith("-token-failed")) return `${status.split("-")[0]} returned an OAuth token error. Check your provider app settings.`;
  return "Provider connection could not be completed.";
}
