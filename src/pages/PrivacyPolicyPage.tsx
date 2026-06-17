import { Seo } from "@/components/Seo";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-foreground">
      <Seo
        title="Privacy Policy — Darpan Academy"
        description="Darpan Academy কীভাবে শিক্ষার্থীদের ব্যক্তিগত তথ্য সংগ্রহ, ব্যবহার ও সুরক্ষা করে — আমাদের গোপনীয়তা নীতি।"
        path="/privacy"
      />
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-6">Last updated: June 17, 2026</p>

      <section className="space-y-4 text-muted-foreground">
        <p>Darpan Academy ("we", "us") respects your privacy. This policy explains what information we collect and how we use it.</p>

        <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
        <p>Name, email address, phone number, institution, payment reference and learning activity (course progress, exam submissions).</p>

        <h2 className="text-xl font-semibold text-foreground">2. How We Use It</h2>
        <p>To create your account, verify enrollment, deliver courses and exams, provide support, and improve our services.</p>

        <h2 className="text-xl font-semibold text-foreground">3. Data Storage</h2>
        <p>Your data is stored securely on Google Firebase. We do not sell your data to third parties.</p>

        <h2 className="text-xl font-semibold text-foreground">4. Cookies & Local Storage</h2>
        <p>We use browser storage to keep you signed in and to cache data for a faster experience.</p>

        <h2 className="text-xl font-semibold text-foreground">5. Your Rights</h2>
        <p>You may request access, correction or deletion of your personal data by contacting support@darpan-academy.app.</p>

        <h2 className="text-xl font-semibold text-foreground">6. Contact</h2>
        <p>For privacy-related questions: support@darpan-academy.app</p>
      </section>
    </div>
  );
}
