import { NextResponse } from "next/server";
import { obterImagem } from "@/lib/imagens";

export const dynamic = "force-dynamic";

/** Público: serve a imagem de produto guardada no banco, com cache longo (conteúdo imutável). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const img = await obterImagem(id);
  if (!img) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(img.dados), {
    headers: {
      "content-type": img.mime,
      "content-length": String(img.tamanho),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
