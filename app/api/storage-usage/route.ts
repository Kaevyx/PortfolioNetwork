import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

/**
 * API route to get user's storage usage and limits
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let supabase;
    try {
      supabase = await createClient();
    } catch (clientError: any) {
      console.error("Error creating Supabase client:", clientError);
      // Return empty data if client creation fails
      return NextResponse.json({
        usedBytes: 0,
        usedMB: 0,
        limitBytes: 50 * 1024 * 1024,
        limitMB: 50,
        percentage: 0,
        fileCount: 0,
        lastUpdated: new Date().toISOString(),
        breakdown: [],
      });
    }

    // Try to get storage usage from storage_usage table first (faster, cached)
    // Fall back to calculating from storage_files if needed
    let usedBytes = 0;
    let fileCount = 0;
    let lastUpdated: string | null = null;
    let breakdown: Record<string, { count: number; size: number }> = {};
    let files: any[] | null = null;
    
    try {
      // First, try to get from storage_usage table (should be faster)
      // Use maybeSingle() to avoid errors if record doesn't exist, and increase timeout
      const { data: storageUsage, error: usageError } = await Promise.race([
        supabase
          .from("storage_usage")
          .select("total_bytes, file_count, last_updated")
          .eq("user_id", userId)
          .maybeSingle(), // Use maybeSingle() instead of single() to avoid errors if record doesn't exist
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Request timeout")), 10000) // Increased to 10 seconds
        )
      ]) as any;

      if (!usageError && storageUsage) {
        usedBytes = storageUsage.total_bytes || 0;
        fileCount = storageUsage.file_count || 0;
        lastUpdated = storageUsage.last_updated;
      } else if (usageError && usageError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine, we'll calculate from files
        // Other errors should be logged
        console.log("Error fetching from storage_usage table:", usageError?.message);
      }
    } catch (usageError: any) {
      // If storage_usage query fails or times out, we'll calculate from files
      // Only log if it's not a simple timeout (which is expected on slow connections)
      if (usageError?.message !== "Request timeout") {
        console.log("Could not fetch from storage_usage table, will calculate from files:", usageError?.message);
      }
    }

    // If we don't have data from storage_usage, or if it's stale, calculate from files
    // Only fetch files if we need breakdown or if storage_usage is missing
    if (!lastUpdated || !usedBytes) {
      try {
        // Fetch files with error handling and longer timeout for large datasets
        const filesResult = await Promise.race([
          supabase
            .from("storage_files")
            .select("file_type, file_size")
            .eq("user_id", userId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Request timeout")), 30000) // Increased to 30 seconds
          )
        ]) as any;
        
        if (filesResult?.error) {
          console.error("Error fetching files from Supabase:", filesResult.error);
          // If we have storage_usage data, use that instead
          if (usedBytes > 0) {
            files = null; // Don't try to calculate breakdown
          } else {
            // No data at all, return empty
            return NextResponse.json({
              usedBytes: 0,
              usedMB: 0,
              limitBytes: 50 * 1024 * 1024,
              limitMB: 50,
              percentage: 0,
              fileCount: 0,
              lastUpdated: new Date().toISOString(),
              breakdown: [],
            });
          }
        } else {
          files = filesResult?.data || null;
          
          // Calculate from files if we got them
          if (files) {
            usedBytes = files.reduce((sum: number, file: any) => sum + (file.file_size || 0), 0);
            fileCount = files.length;
            lastUpdated = new Date().toISOString();
          }
        }
      } catch (fetchError: any) {
        // Handle network/connection errors and timeouts
        console.error("Error fetching files (network/timeout error):", {
          message: fetchError.message || "Unknown error",
          name: fetchError.name,
        });
        
        // If we have storage_usage data, use that instead
        if (usedBytes === 0) {
          // No data at all, return empty
          return NextResponse.json({
            usedBytes: 0,
            usedMB: 0,
            limitBytes: 50 * 1024 * 1024,
            limitMB: 50,
            percentage: 0,
            fileCount: 0,
            lastUpdated: new Date().toISOString(),
            breakdown: [],
          });
        }
        // Otherwise continue with storage_usage data
        files = null;
      }
    }

    // Calculate MB from bytes
    const usedMB = Math.round((usedBytes / (1024 * 1024)) * 100) / 100;

    // Update storage_usage table if we calculated from files (async, don't wait)
    if (files && usedBytes > 0) {
      const currentTime = new Date().toISOString();
      // Update in background, don't wait for it
      supabase
        .from("storage_usage")
        .upsert({
          user_id: userId,
          total_bytes: usedBytes,
          file_count: fileCount,
          last_updated: currentTime,
        }, {
          onConflict: "user_id"
        })
        .then(() => {
          // Update successful
        })
        .catch((err) => {
          console.error("Error updating storage_usage table:", err);
        });
      
      if (!lastUpdated) {
        lastUpdated = currentTime;
      }
    }

    // Get user's plan
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_plan")
      .eq("clerk_id", userId)
      .single();

    // Get storage limit for plan (with fallback if subscription_plans table doesn't exist)
    let limitMB = 50; // Default free tier limit
    try {
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("max_storage_mb")
        .eq("name", profile?.subscription_plan || "free")
        .single();

      if (!planError && plan) {
        limitMB = plan.max_storage_mb || 50;
      }
    } catch (error) {
      // If subscription_plans table doesn't exist, use default
      console.log("Subscription plans table not available, using default limit");
    }
    const limitBytes = limitMB * 1024 * 1024;
    const percentage = Math.round((usedBytes / limitBytes) * 100);

    // Get file breakdown by type (only if we have files data)
    if (files) {
      files.forEach((file) => {
        if (!breakdown[file.file_type]) {
          breakdown[file.file_type] = { count: 0, size: 0 };
        }
        breakdown[file.file_type].count++;
        breakdown[file.file_type].size += file.file_size || 0;
      });
    } else if (usedBytes > 0) {
      // If we don't have files but have usage data, try to get breakdown from storage_usage
      // For now, return empty breakdown - could be enhanced later
      breakdown = {};
    }

    return NextResponse.json({
      usedBytes,
      usedMB,
      limitBytes,
      limitMB,
      percentage,
      fileCount,
      lastUpdated: lastUpdated || new Date().toISOString(),
      breakdown: Object.entries(breakdown).map(([type, data]) => ({
        type,
        count: data.count,
        sizeMB: Math.round((data.size / (1024 * 1024)) * 100) / 100,
      })),
    });
  } catch (error: any) {
    console.error("Storage usage error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}


