ALTER TABLE "links_checkout" ADD COLUMN "parcelas_sem_juros" integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE "links_checkout" ADD COLUMN "juros_mensal_bps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "juros_centavos" integer DEFAULT 0 NOT NULL;