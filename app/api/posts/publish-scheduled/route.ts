import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * API route to publish scheduled posts
 * This should be called periodically (e.g., via cron job) to publish scheduled posts
 * GET method doesn't require auth (safe - only publishes due posts)
 * POST method requires CRON_SECRET for external cron jobs
 */
export async function GET(request: NextRequest) {
  // GET method is safe - it only publishes posts that are due
  return await publishScheduledPosts();
}

export async function POST(request: NextRequest) {
  try {
    // POST method requires auth for external cron jobs
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET || "your-secret-token";
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    return await publishScheduledPosts();
  } catch (error: any) {
    console.error("Error in POST publish-scheduled:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

async function publishScheduledPosts() {
  try {

    const supabase = await createClient();
    
    // Get all scheduled posts that should be published now
    const now = new Date().toISOString();
    
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from("posts")
      .select("*")
      .eq("is_scheduled", true)
      .not("scheduled_at", "is", null)
      .lte("scheduled_at", now)
      .is("published_at", null);

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch scheduled posts", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return NextResponse.json({
        message: "No scheduled posts to publish",
        published: 0,
      });
    }

    // Publish each scheduled post
    let publishedCount = 0;
    const errors: string[] = [];

    for (const post of scheduledPosts) {
      try {
        const { error: updateError } = await supabase
          .from("posts")
          .update({
            is_scheduled: false,
            published_at: new Date().toISOString(),
            created_at: post.scheduled_at, // Set created_at to scheduled time for proper ordering
          })
          .eq("id", post.id);

        if (updateError) {
          errors.push(`Failed to publish post ${post.id}: ${updateError.message}`);
        } else {
          publishedCount++;
          
          // Create notification for the user
          try {
            await supabase.from("notifications").insert({
              user_id: post.profile_id,
              type: "admin_notification",
              actor_id: post.profile_id, // Self notification
              target_id: post.id,
              message: `Your scheduled post has been published!`,
            });
          } catch (notifError) {
            console.error(`Error creating notification for post ${post.id}:`, notifError);
            // Don't fail the publish if notification fails
          }
        }
      } catch (error: any) {
        errors.push(`Error publishing post ${post.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: `Published ${publishedCount} scheduled post(s)`,
      published: publishedCount,
      total: scheduledPosts.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error publishing scheduled posts:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

