import { NextRequest, NextResponse } from "next/server";

/**
 * API route to verify if a CV/resume link is accessible
 * This checks if the URL returns a valid HTTP response
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Basic URL validation
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { 
          verified: false, 
          error: "Invalid URL format",
          message: "Please enter a valid URL (e.g., https://example.com/cv.pdf)"
        },
        { status: 400 }
      );
    }

    // Only allow HTTP/HTTPS protocols
    if (!["http:", "https:"].includes(validUrl.protocol)) {
      return NextResponse.json(
        { 
          verified: false, 
          error: "Invalid protocol",
          message: "Only HTTP and HTTPS URLs are allowed"
        },
        { status: 400 }
      );
    }

    // Check if URL is accessible (HEAD request to avoid downloading large files)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CV-Verifier/1.0)",
        },
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") || "";
      const contentLength = response.headers.get("content-length");
      
      // Check if it's likely a document (PDF, Word, etc.)
      const isDocument = 
        contentType.includes("pdf") ||
        contentType.includes("msword") ||
        contentType.includes("wordprocessingml") ||
        contentType.includes("text/plain") ||
        url.toLowerCase().match(/\.(pdf|doc|docx)$/i);

      // Check file size (if available) - warn if too large (>10MB)
      const sizeInMB = contentLength ? parseInt(contentLength) / (1024 * 1024) : null;
      const isTooLarge = sizeInMB && sizeInMB > 10;

      if (response.ok) {
        return NextResponse.json({
          verified: true,
          accessible: true,
          statusCode: response.status,
          contentType,
          isDocument,
          sizeInMB: sizeInMB ? sizeInMB.toFixed(2) : null,
          isTooLarge,
          message: isDocument 
            ? "Link is accessible and appears to be a document"
            : "Link is accessible, but may not be a CV/resume document",
          warning: isTooLarge ? "File size is quite large (>10MB). Consider using a PDF instead." : null,
        });
      } else {
        return NextResponse.json({
          verified: false,
          accessible: false,
          statusCode: response.status,
          error: `URL returned status ${response.status}`,
          message: "The link is not accessible. Please check if the URL is correct and publicly accessible.",
        });
      }
    } catch (fetchError: any) {
      if (fetchError.name === "AbortError") {
        return NextResponse.json({
          verified: false,
          accessible: false,
          error: "Request timeout",
          message: "The link took too long to respond. It may be slow or inaccessible.",
        });
      }

      return NextResponse.json({
        verified: false,
        accessible: false,
        error: fetchError.message || "Failed to verify link",
        message: "Unable to verify the link. It may be private, require authentication, or the server may be down.",
      });
    }
  } catch (error: any) {
    console.error("Error verifying CV link:", error);
    return NextResponse.json(
      { 
        verified: false,
        error: error.message || "Internal server error",
        message: "An error occurred while verifying the link."
      },
      { status: 500 }
    );
  }
}






