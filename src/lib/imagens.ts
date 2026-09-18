import "server-only";
import { eq } from "drizzle-orm";
import { obterDb } from "@/db";
import { imagens } from "@/db/schema";
import { ErroDominio } from "@/lib/produtos";

export const TAMANHO_MAXIMO_IMAGEM = 2 * 1024 * 1024; // 2 MB
export const MIMES_PERMITIDOS = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);

export async function salvarImagem(arquivo: File) {
  if (!MIMES_PERMITIDOS.has(arquivo.type)) {
    throw new ErroDominio("Formato não suportado. Use PNG, JPG, WebP, GIF ou SVG.", 400, { imagem: "Formato não suportado." });
  }
  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {
    throw new ErroDominio("A imagem precisa ter no máximo 2 MB.", 400, { imagem: "Máximo de 2 MB." });
  }
  const dados = Buffer.from(await arquivo.arrayBuffer());
  const db = await obterDb();
  const [criada] = await db
    .insert(imagens)
    .values({ mime: arquivo.type, tamanho: dados.byteLength, dados })
    .returning({ id: imagens.id, mime: imagens.mime, tamanho: imagens.tamanho });
  return criada;
}

export async function obterImagem(id: string) {
  const db = await obterDb();
  const [img] = await db.select().from(imagens).where(eq(imagens.id, id)).limit(1);
  return img ?? null;
}
