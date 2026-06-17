import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-foreground">
      <Seo
        title="About Darpan Academy — দর্পণ একাডেমি সম্পর্কে"
        description="দর্পণ একাডেমি বাংলাদেশী শিক্ষার্থীদের জন্য মানসম্মত অনলাইন কোর্স, লাইভ ক্লাস ও পরীক্ষা প্রদানের একটি e-learning প্ল্যাটফর্ম।"
        path="/about"
      />
      <h1 className="text-3xl font-bold mb-4">About Darpan Academy</h1>
      <p className="mb-4 text-muted-foreground">
        দর্পণ একাডেমি (Darpan Academy) হলো বাংলাদেশী শিক্ষার্থীদের জন্য একটি অনলাইন শিক্ষা প্ল্যাটফর্ম। আমরা SSC, HSC, এডমিশন এবং অন্যান্য একাডেমিক প্রস্তুতির জন্য মানসম্মত কোর্স, লাইভ ক্লাস ও নিয়মিত পরীক্ষার সুবিধা দিই।
      </p>
      <p className="mb-4 text-muted-foreground">
        Darpan Academy is an online learning platform dedicated to providing affordable, high-quality education to students across Bangladesh through structured courses, live classes and regular assessments.
      </p>
      <h2 className="text-xl font-semibold mt-6 mb-2">Our Mission</h2>
      <p className="text-muted-foreground mb-6">
        মানসম্মত শিক্ষাকে সকল শিক্ষার্থীর কাছে সহজলভ্য করা — সাশ্রয়ী মূল্যে, যেকোনো জায়গা থেকে।
      </p>
      <p className="text-sm">
        <Link to="/courses" className="text-primary underline">Browse Courses</Link>
        {" · "}
        <Link to="/contact" className="text-primary underline">Contact</Link>
      </p>
    </div>
  );
}
