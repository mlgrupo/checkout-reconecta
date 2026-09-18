import Script from "next/script";

/**
 * Instala o container do Google Tag Manager nas páginas públicas.
 * O id vem do painel (Configurações) ou de NEXT_PUBLIC_GTM_ID.
 */
export function Gtm({ id }: { id: string | null }) {
  if (!id) return null;
  return (
    <>
      <Script id="gtm-base" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${id}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
