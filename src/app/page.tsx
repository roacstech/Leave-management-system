import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  // Not logged in
  if (!session?.user) {
    redirect("/login");
  }

  // Redirect based on role
  switch (session.user.role) {
    case "ADMIN":
      redirect("/admin/dashboard");

    case "EMPLOYEE":
      redirect("/employee/dashboard");

    case "TL":
      redirect("/tl/dashboard");

    case "CEO":
      redirect("/ceo/dashboard");

    default:
      redirect("/unauthorized");
  }
}