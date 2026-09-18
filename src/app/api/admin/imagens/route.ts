import { NextResponse } from "next/server";
import { respostaErro } from "@/lib/api";
import { exigirApi } from "@/lib/auth/session";
import { salvarImagem } from "@/lib/imagens";

export const dynamic = "force-dynamic";

/** POST multipart/form-data { arquivo } → { imagem: { id, mime, tamanho, url } } */
export async function POST(req: Request) {
  const auth = await exigirApi("operador");
  if (auth.erro) return auth.erro;
  try {
    const form = await req.formData();
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File)) {
      return NextResponse.json({ erro: "Envie um arquivo no campo 'arquivo'." }, { status: 400 });
    }
    const imagem = await salvarImagem(arquivo);
    return NextResponse.json({ imagem: { ...imagem, url: `/api/imagens/${imagem.id}` } }, { status: 201 });
  } catch (e) {
    return respostaErro(e);
  }
}
