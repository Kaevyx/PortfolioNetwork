import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { checkContentSafety } from "@/lib/utils/databaseContentModeration";
import { logBlockedAttempt } from "@/lib/utils/databaseContentModeration";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const body = await request.json();
    const { recipient_id, content } = body;

    if (!recipient_id || !content?.trim()) {
      return NextResponse.json(
        { error: "Recipient ID and message content are required" },
        { status: 400 }
      );
    }

    if (recipient_id === userId) {
      return NextResponse.json(
        { error: "Cannot send message to yourself" },
        { status: 400 }
      );
    }

    // Check for blocked domains and inappropriate content
    const safetyCheck = await checkContentSafety(content.trim());
    if (!safetyCheck.isSafe) {
      // Log the blocked attempt
      try {
        await logBlockedAttempt({
          userId: userId,
          contentType: 'message',
          attemptedContent: content.trim(),
          matchedKeyword: safetyCheck.matchedKeyword,
          matchedDomain: safetyCheck.matchedDomain,
          category: safetyCheck.category,
          severity: safetyCheck.severity,
          messageShown: safetyCheck.reason,
          contextUrl: `/inbox`,
          keywordId: safetyCheck.keywordId,
          domainId: safetyCheck.domainId,
        });
      } catch (error) {
        console.error("Error logging blocked attempt:", error);
      }
      
      return NextResponse.json(
        { 
          error: safetyCheck.reason || "Your message violates our community guidelines. Please reconsider your message and ensure it is respectful and appropriate." 
        },
        { status: 400 }
      );
    }

    // Verify recipient exists
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('clerk_id')
      .eq('clerk_id', recipient_id)
      .single();

    if (recipientError || !recipient) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    // Get or create conversation
    const { data: conversationId, error: convError } = await supabase.rpc(
      'get_or_create_conversation',
      {
        p_user1_id: userId,
        p_user2_id: recipient_id
      }
    );

    if (convError) throw convError;

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        recipient_id: recipient_id,
        content: content.trim(),
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Create notification for recipient
    await supabase.from('notifications').insert({
      user_id: recipient_id,
      type: 'message',
      actor_id: userId,
      target_id: conversationId,
      message: `You have a new message`,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}

