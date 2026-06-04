import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/AuthForm";

export default function ResetPasswordPage() {
  return <main className="grid min-h-screen place-items-center px-6"><Suspense><ResetPasswordForm /></Suspense></main>;
}
