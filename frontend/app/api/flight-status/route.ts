import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServer } from "http";

// Import the Node backend handler
const {
  flightStatusStream,
} = require("../../../../backend/flightStatusStream.js");

export async function GET(request: NextRequest) {
  // Extract flightId from query params
  const { searchParams } = new URL(request.url);
  const flightId = searchParams.get("flightId");
  if (!flightId) {
    return new NextResponse("Missing flightId", { status: 400 });
  }

  // This is a workaround to bridge Node handler with Next.js API route
  // Next.js API routes run in an edge/serverless environment, so direct piping is not always possible
  // We'll use a custom Response with a TransformStream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Create a mock req/res to pass to the Node handler
  const req = {
    params: { flightId },
    on: (event, cb) => {
      if (event === "close") {
        // Not implemented: you may want to handle abort signals
      }
    },
  };
  const res = {
    setHeader: () => {},
    write: (chunk) => {
      writer.write(new TextEncoder().encode(chunk));
    },
  };

  // Call the Node backend SSE handler
  flightStatusStream(req, res);

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
