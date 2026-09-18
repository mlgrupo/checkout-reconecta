"use client";

import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Auth0Provider>
      <ToastProvider>{children}</ToastProvider>
    </Auth0Provider>
  );
}
