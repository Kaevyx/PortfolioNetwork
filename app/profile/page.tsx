import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get user's profile to use username if available, otherwise use clerk_id
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, clerk_id")
    .eq("clerk_id", userId)
    .single();

  // Use username if available, otherwise fallback to clerk_id
  const profileIdentifier = profile?.username || userId;
  redirect(`/profile/${profileIdentifier}`);
}






