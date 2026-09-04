import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Try RPC function first
    let count = 0;
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_user_unread_message_count',
        { p_user_id: userId }
      );

      if (rpcError) {
        throw rpcError;
      }

      count = rpcData || 0;
    } catch (rpcError: any) {
      // RPC failed, fallback to direct query
      console.error("RPC error, falling back to direct query:", rpcError?.message || rpcError);
      
      try {
        // Fallback: Calculate unread count directly from conversations
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('participant1_id, participant2_id, participant1_unread_count, participant2_unread_count')
          .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`);

        if (convError) {
          console.error("Fallback query error:", convError);
          // Return 0 if both queries fail
          return NextResponse.json({ count: 0 }, { status: 200 });
        }

        // Calculate total unread count
        count = (conversations || []).reduce((total, conv) => {
          if (conv.participant1_id === userId) {
            return total + (conv.participant1_unread_count || 0);
          } else if (conv.participant2_id === userId) {
            return total + (conv.participant2_unread_count || 0);
          }
          return total;
        }, 0);
      } catch (fallbackError) {
        console.error("Fallback query also failed:", fallbackError);
        // Return 0 if both queries fail
        return NextResponse.json({ count: 0 }, { status: 200 });
      }
    }

    return NextResponse.json({ count }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching unread count:", {
      message: error.message,
      details: error.details || error.toString(),
      hint: error.hint || '',
      code: error.code || ''
    });
    return NextResponse.json(
      { error: error.message || "Failed to fetch unread count", count: 0 },
      { status: 500 }
    );
  }
}

