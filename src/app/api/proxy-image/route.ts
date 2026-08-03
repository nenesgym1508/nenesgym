import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")
  if (!url) return new NextResponse("Falta parametro url", { status: 400 })

  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return new NextResponse("No se pudo obtener la imagen remota", { status: res.status })

    const arrayBuffer = await res.arrayBuffer()
    const contentType = res.headers.get("content-type") || "image/jpeg"

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch {
    return new NextResponse("Error de red al traer la imagen", { status: 500 })
  }
}
