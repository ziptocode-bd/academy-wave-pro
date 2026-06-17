import { Seo } from "@/components/Seo";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-foreground">
      <Seo
        title="Terms of Service — Darpan Academy"
        description="Darpan Academy ব্যবহারের নিয়ম ও শর্তাবলী — অ্যাকাউন্ট, এনরোলমেন্ট, কন্টেন্ট ও আচরণবিধি।"
        path="/terms"
      />
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-6">Last updated: June 17, 2026</p>

      <section className="space-y-4 text-muted-foreground">
        <h2 className="text-xl font-semibold text-foreground">1. Acceptance</h2>
        <p>By creating an account or using Darpan Academy you agree to these Terms.</p>

        <h2 className="text-xl font-semibold text-foreground">2. Account</h2>
        <p>You are responsible for the security of your account credentials. A single account may be active on a limited number of devices.</p>

        <h2 className="text-xl font-semibold text-foreground">3. Enrollment & Payment</h2>
        <p>Access to paid courses is granted after admin approval of your payment. Pricing is displayed in BDT.</p>

        <h2 className="text-xl font-semibold text-foreground">4. Content Usage</h2>
        <p>All videos, notes and exam questions are the property of Darpan Academy and its instructors. Downloading, recording, redistributing or sharing course content is strictly prohibited and may result in account termination.</p>

        <h2 className="text-xl font-semibold text-foreground">5. Acceptable Use</h2>
        <p>Cheating in exams, abusing other users, or attempting to bypass platform security will result in immediate termination without refund.</p>

        <h2 className="text-xl font-semibold text-foreground">6. Changes</h2>
        <p>We may update these Terms at any time. Continued use constitutes acceptance.</p>

        <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
        <p>support@darpan-academy.app</p>
      </section>
    </div>
  );
}
