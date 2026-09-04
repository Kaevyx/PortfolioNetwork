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
    
    // Check availability using the SQL function
    const { data, error } = await supabase.rpc('check_username_availability', {
      p_username: username,
      p_exclude_clerk_id: userId
    });

    if (error) {
      console.error("Error checking username:", error);
      return NextResponse.json({ error: "Failed to check username availability" }, { status: 500 });
    }

    if (data && data.length > 0) {
      return NextResponse.json({
        available: data[0].available,
        message: data[0].message
      });
    }

    return NextResponse.json({ available: false, message: "Unknown error" }, { status: 500 });
  } catch (error: any) {
    console.error("Error in check-username API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


