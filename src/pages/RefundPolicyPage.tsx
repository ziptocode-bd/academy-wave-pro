import { Seo } from "@/components/Seo";

export default function RefundPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-foreground">
      <Seo
        title="Refund Policy — Darpan Academy"
        description="Darpan Academy এর কোর্স পেমেন্ট রিফান্ড সংক্রান্ত নীতিমালা।"
        path="/refund"
      />
      <h1 className="text-3xl font-bold mb-4">Refund Policy</h1>
      <p className="text-sm text-muted-foreground mb-6">Last updated: June 17, 2026</p>

      <section className="space-y-4 text-muted-foreground">
        <p>Due to the digital nature of our courses, all payments are generally non-refundable once content access has been granted.</p>

        <h2 className="text-xl font-semibold text-foreground">Eligibility for Refund</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Duplicate payment for the same course.</li>
          <li>Payment received but enrollment not approved within 7 days.</li>
          <li>Course cancellation by Darpan Academy.</li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground">How to Request</h2>
        <p>Email support@darpan-academy.app with your transaction ID and the reason within 7 days of payment. Approved refunds are processed within 14 working days.</p>
      </section>
    </div>
  );
}
