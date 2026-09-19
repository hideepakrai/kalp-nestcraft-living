import { Metadata } from "next";
import { Suspense } from "react";
import SignupPageClient from "./_components/SignupPageClient";

export const metadata: Metadata = {
  title: "Create Account | NestCraft Living",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignupPageClient />
    </Suspense>
  );
}
