import { supabase } from "@/integrations/supabase/client";

export async function getAuthenticatedHeaders() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error("Sessão expirada. Entre novamente.");
  }

  return {
    headers: { Authorization: `Bearer ${session.access_token}` },
    session,
  };
}

export function authErrorMessage(error: unknown, fallback = "Erro de autenticação") {
  if (error instanceof Response && error.status === 401) {
    return "Sessão expirada. Entre novamente.";
  }
  if (error instanceof Error) return error.message;
  return fallback;
}