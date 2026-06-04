"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false
    });
    setLoading(false);
    if (result?.error) setError("Invalid email or password.");
    else router.push("/dashboard");
  }
  return <AuthShell title="Sign in" mode="login" onSubmit={submit} error={error} loading={loading} />;
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password")
      })
    });
    if (!res.ok) {
      setLoading(false);
      setError("Could not create that account.");
      return;
    }
    await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirect: false });
    router.push("/dashboard");
  }
  return <AuthShell title="Create account" mode="register" onSubmit={submit} error={error} loading={loading} />;
}

function AuthShell({ title, mode, onSubmit, error, loading }: { title: string; mode: "login" | "register"; onSubmit: (formData: FormData) => void; error: string; loading: boolean }) {
  return (
    <form action={onSubmit} className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {mode === "register" && <input className="field mt-6" name="name" placeholder="Name" required />}
      <input className="field mt-4" name="email" type="email" placeholder="Email" required />
      <input className="field mt-4" name="password" type="password" placeholder="Password" minLength={8} required />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button className="btn mt-5 w-full" disabled={loading}>{loading ? "Working..." : title}</button>
      <div className="mt-4 flex justify-between text-sm text-steel">
        <a href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Create account" : "Sign in"}</a>
        <a href="/forgot-password">Reset password</a>
      </div>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  async function submit(formData: FormData) {
    const res = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData.get("email") })
    });
    const data = await res.json();
    setMessage(data.resetUrl ? `Development reset link: ${data.resetUrl}` : "If the account exists, a reset link has been issued.");
  }
  return (
    <form action={submit} className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <input className="field mt-6" name="email" type="email" placeholder="Email" required />
      <button className="btn mt-5 w-full">Create reset link</button>
      {message && <p className="mt-4 break-words text-sm text-steel">{message}</p>}
    </form>
  );
}

export function ResetPasswordForm() {
  const params = useSearchParams();
  const [message, setMessage] = useState("");
  async function submit(formData: FormData) {
    const res = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: params.get("email"),
        token: params.get("token"),
        password: formData.get("password")
      })
    });
    setMessage(res.ok ? "Password updated. You can sign in now." : "Reset link is invalid or expired.");
  }
  return (
    <form action={submit} className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Choose new password</h1>
      <input className="field mt-6" name="password" type="password" placeholder="New password" minLength={8} required />
      <button className="btn mt-5 w-full">Update password</button>
      {message && <p className="mt-4 text-sm text-steel">{message}</p>}
    </form>
  );
}
