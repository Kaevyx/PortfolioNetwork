import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

/**
 * API route for users to submit reports
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

    const body = await request.json();
    const { reportedType, reportedId, reason, details } = body;

    if (!reportedType || !reportedId || !reason) {
      return NextResponse.json(
        { error: "reportedType, reportedId, and reason are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user has already reported this item
    const { data: existingReport } = await supabase
      .from("reports")
      .select("id")
      .eq("reporter_id", userId)
      .eq("reported_type", reportedType)
      .eq("reported_id", reportedId)
      .eq("status", "pending")
      .single();

    if (existingReport) {
      return NextResponse.json(
        { error: "You have already submitted a pending report for this item" },
        { status: 400 }
      );
    }

    // Create report
    const { data, error } = await supabase
      .from("reports")
      .insert({
        reporter_id: userId,
        reported_type: reportedType,
        reported_id: reportedId,
        reason,
        details: details || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      reportId: data.id,
      message: "Report submitted successfully. Our moderation team will review it.",
    });
  } catch (error: any) {
    console.error("Report submission error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}





