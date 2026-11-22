import { redirect } from "next/navigation";

// Public sign-up is closed: the super admin creates businesses and owner accounts (/admin/new).
export default function SignupPage() {
  redirect("/login");
}
