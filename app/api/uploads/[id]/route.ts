import { NextResponse, type NextRequest } from "next/server";
import { del } from "@vercel/blob";

type RouteParams = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

const decodeBlobUrl = (id: string) => Buffer.from(id, "base64url").toString();

export async function GET(_request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const blobUrl = decodeBlobUrl(id);
    return NextResponse.redirect(blobUrl, { status: 307 });
  } catch (error) {
    console.error("Failed to redirect to blob", error);
    return new NextResponse("Not found", { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const blobUrl = decodeBlobUrl(id);
    const pathname = new URL(blobUrl).pathname.slice(1);

    if (!pathname) {
      return NextResponse.json({ error: "Invalid blob id" }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error("BLOB_READ_WRITE_TOKEN is not configured for delete.");
      return NextResponse.json({ error: "Storage is not configured." }, { status: 500 });
    }

    await del(pathname, { token });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes("Not Found")) {
      return NextResponse.json({ success: true });
    }
    console.error("Failed to delete blob", error);
    return NextResponse.json(
      { error: "Unable to delete image" },
      { status: 500 }
    );
  }
}
