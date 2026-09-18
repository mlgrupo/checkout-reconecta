CREATE TABLE "configuracoes" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eventos_pedido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"descricao" text NOT NULL,
	"dados" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eventos_webhook" (
	"id" text PRIMARY KEY NOT NULL,
	"evento" text NOT NULL,
	"cobranca_id" text,
	"payload" jsonb NOT NULL,
	"recebido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"processado_em" timestamp with time zone,
	"erro" text
);
--> statement-breakpoint
CREATE TABLE "imagens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mime" text NOT NULL,
	"tamanho" integer NOT NULL,
	"dados" "bytea" NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links_checkout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"produto_id" uuid NOT NULL,
	"bump_produto_id" uuid,
	"bump_preco_centavos" integer,
	"bump_titulo" text,
	"bump_descricao" text,
	"metodos" jsonb DEFAULT '["pix","boleto","cartao"]'::jsonb NOT NULL,
	"parcelas_max" integer DEFAULT 1 NOT NULL,
	"url_sucesso" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_checkout_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "pedido_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"produto_id" uuid,
	"tipo" text NOT NULL,
	"nome" text NOT NULL,
	"preco_centavos" integer NOT NULL,
	"quantidade" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" integer GENERATED ALWAYS AS IDENTITY (sequence name "pedidos_numero_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"link_id" uuid,
	"produto_id" uuid,
	"status" text DEFAULT 'aguardando' NOT NULL,
	"metodo" text NOT NULL,
	"valor_total_centavos" integer NOT NULL,
	"bump_aceito" boolean DEFAULT false NOT NULL,
	"cliente_nome" text NOT NULL,
	"cliente_email" text NOT NULL,
	"cliente_cpf_cnpj" text NOT NULL,
	"cliente_telefone" text,
	"asaas_cliente_id" text,
	"asaas_cobranca_id" text,
	"asaas_status" text,
	"asaas_invoice_url" text,
	"asaas_boleto_url" text,
	"pix_payload" text,
	"pix_imagem_base64" text,
	"pix_expira_em" timestamp with time zone,
	"boleto_linha_digitavel" text,
	"boleto_vencimento" text,
	"cartao_bandeira" text,
	"cartao_final" text,
	"parcelas" integer DEFAULT 1 NOT NULL,
	"utm" jsonb,
	"ip" text,
	"user_agent" text,
	"pago_em" timestamp with time zone,
	"sincronizado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pedidos_asaas_cobranca_id_unique" UNIQUE("asaas_cobranca_id")
);
--> statement-breakpoint
CREATE TABLE "produtos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	"descricao" text,
	"preco_centavos" integer NOT NULL,
	"imagem_id" uuid,
	"imagem_url" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "produtos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "eventos_pedido" ADD CONSTRAINT "eventos_pedido_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links_checkout" ADD CONSTRAINT "links_checkout_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links_checkout" ADD CONSTRAINT "links_checkout_bump_produto_id_produtos_id_fk" FOREIGN KEY ("bump_produto_id") REFERENCES "public"."produtos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_link_id_links_checkout_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links_checkout"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_imagem_id_imagens_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."imagens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eventos_pedido_pedido_idx" ON "eventos_pedido" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "links_produto_idx" ON "links_checkout" USING btree ("produto_id");--> statement-breakpoint
CREATE INDEX "pedidos_status_idx" ON "pedidos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pedidos_criado_idx" ON "pedidos" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "pedidos_email_idx" ON "pedidos" USING btree ("cliente_email");--> statement-breakpoint
CREATE INDEX "produtos_ativo_idx" ON "produtos" USING btree ("ativo");