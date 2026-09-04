import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

// Track a page visit
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const supabase = await createClient();
    
    // Handle both JSON and Blob (from sendBeacon)
    let body;
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      body = await request.json();
    } else {
      // Handle blob from sendBeacon
      const blob = await request.blob();
      const text = await blob.text();
      body = JSON.parse(text);
    }
    const {
      sessionId,
      pagePath,
      pageTitle,
      referrer,
      entryPage,
      userAgent,
      browserName,
      browserVersion,
      osName,
      osVersion,
      deviceType,
      deviceBrand,
      deviceModel,
      screenWidth,
      screenHeight,
      ipAddress,
      country,
      countryCode,
      region,
      city,
      latitude,
      longitude,
      timezone,
      timeOnPage,
      scrollDepth,
    } = body;

    if (!sessionId || !pagePath) {
      return NextResponse.json(
        { error: "sessionId and pagePath are required" },
        { status: 400 }
      );
    }

    // Get client IP from headers
    const clientIp = 
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      ipAddress ||
      "unknown";

    // Insert visit record
    const { error } = await supabase.from("visits").insert({
      session_id: sessionId,
      user_id: userId || null,
      page_path: pagePath,
      page_title: pageTitle || null,
      referrer: referrer || null,
      entry_page: entryPage || false,
      user_agent: userAgent || null,
      browser_name: browserName || null,
      browser_version: browserVersion || null,
      os_name: osName || null,
      os_version: osVersion || null,
      device_type: deviceType || null,
      device_brand: deviceBrand || null,
      device_model: deviceModel || null,
      screen_width: screenWidth || null,
      screen_height: screenHeight || null,
      ip_address: clientIp !== "unknown" ? clientIp : null,
      country: country || null,
      country_code: countryCode || null,
      region: region || null,
      city: city || null,
      latitude: latitude || null,
      longitude: longitude || null,
      timezone: timezone || null,
      time_on_page: timeOnPage || null,
      scroll_depth: scrollDepth || null,
    });

    if (error) {
      console.error("Error tracking visit:", error);
      return NextResponse.json(
        { error: "Failed to track visit" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in visit tracking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

