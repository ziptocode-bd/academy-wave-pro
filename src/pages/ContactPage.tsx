import { Seo } from "@/components/Seo";

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-foreground">
      <Seo
        title="Contact — Darpan Academy"
        description="দর্পণ একাডেমির সাথে যোগাযোগ করুন — সাপোর্ট, এনরোলমেন্ট ও সাধারণ জিজ্ঞাসার জন্য।"
        path="/contact"
      />
      <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
      <p className="text-muted-foreground mb-4">
        কোর্স, এনরোলমেন্ট, পেমেন্ট বা টেকনিক্যাল সাপোর্ট সংক্রান্ত যেকোনো প্রশ্নের জন্য আমাদের সাথে যোগাযোগ করুন।
      </p>
      <ul className="space-y-2 text-muted-foreground">
        <li><strong className="text-foreground">Email:</strong> support@darpan-academy.app</li>
        <li><strong className="text-foreground">Facebook Page:</strong> Darpan Academy</li>
        <li><strong className="text-foreground">Location:</strong> Bangladesh</li>
      </ul>
    </div>
  );
}
