import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * API route to sync a profile picture with Clerk
 * Used by admin when approving profiles
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { userId: targetUserId, imageUrl } = await request.json();

    if (!targetUserId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Update Clerk profile image (imageUrl can be null to clear it)
    try {
      const clerk = await clerkClient();
      if (imageUrl) {
        await clerk.users.updateUserProfileImage(targetUserId, {
          file: await (await fetch(imageUrl)).blob(),
        });
      } else {
        await clerk.users.deleteUserProfileImage(targetUserId);
      }

      return NextResponse.json({
        success: true,
        message: "Profile picture synced with Clerk",
      });
    } catch (clerkError: any) {
      console.error("Error updating Clerk profile image:", clerkError);
      return NextResponse.json(
        { error: "Failed to sync with Clerk", details: clerkError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}






