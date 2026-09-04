import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await request.json();
    
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Update username using the SQL function (includes plan check and validation)
    const { data, error } = await supabase.rpc('update_profile_username', {
      p_clerk_id: userId,
      p_new_username: username
    });

    if (error) {
      console.error("Error updating username:", error);
      return NextResponse.json({ error: "Failed to update username" }, { status: 500 });
    }

    if (data && data.length > 0) {
      const result = data[0];
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message,
          username: result.username
        });
      } else {
        return NextResponse.json({
          success: false,
          message: result.message
        }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  } catch (error: any) {
    console.error("Error in update-username API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


