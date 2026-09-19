import { Metadata } from "next";
import { Suspense } from "react";
import LoginPageClient from "./_components/LoginPageClient";

export const metadata: Metadata = {
  title: "Sign In | NestCraft Living",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginPageClient />
    </Suspense>
  );
}
