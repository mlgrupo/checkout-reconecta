CREATE TABLE "usuarios_locais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"papel" text DEFAULT 'operador' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"ultimo_acesso_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_locais_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "usuarios_locais_ativo_idx" ON "usuarios_locais" USING btree ("ativo");