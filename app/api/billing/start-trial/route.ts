import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

/**
 * API route to start a 7-day trial for Pro or Ultimate plans
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

    const { planName } = await request.json();
    
    if (!planName || !['pro', 'ultimate'].includes(planName)) {
      return NextResponse.json(
        { error: "Invalid plan name. Must be 'pro' or 'ultimate'" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Start trial using the database function
    const { data, error } = await supabase.rpc('start_trial', {
      p_user_id: userId,
      p_plan_name: planName,
      p_trial_days: 7
    });

    if (error) {
      console.error("Error starting trial:", error);
      
      // Handle specific error cases
      if (error.message?.includes('already has an active')) {
        return NextResponse.json(
          { error: "You already have an active subscription or trial" },
          { status: 400 }
        );
      }
      
      if (error.message?.includes('already used a trial')) {
        return NextResponse.json(
          { error: "You have already used your free trial" },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || "Failed to start trial" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscriptionId: data,
      message: `7-day ${planName} trial started successfully`
    });
  } catch (error: any) {
    console.error("Error starting trial:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

