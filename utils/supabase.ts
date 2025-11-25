import { 
  FunctionsHttpError, 
  FunctionsRelayError, 
  FunctionsFetchError 
} from "@supabase/supabase-js";

export async function parseSupabaseFunctionError(error: unknown) {
  try {
    // ───── Cas 1 : Erreur HTTP provenant de la fonction Edge
    if (error instanceof FunctionsHttpError) {
      const details = await error.context.json().catch(() => null);
      
      return {
        type: "http",
        name: error.name,
        message: details?.message || details?.error || "Une erreur est survenue dans la fonction.",
        details,
      };
    }

    // ───── Cas 2 : Relay Error (communication interne)
    if (error instanceof FunctionsRelayError) {
      return {
        type: "relay",
        message: error.message || "Erreur de relais Supabase.",
        details: null,
      };
    }

    // ───── Cas 3 : Erreur Fetch (connexion, réseau, timeout, DNS…)
    if (error instanceof FunctionsFetchError) {
      return {
        type: "fetch",
        message: error.message || "Impossible de contacter la fonction.",
        details: null,
      };
    }

    // ───── Cas 4 : erreur inconnue
    return {
      type: "unknown",
      message: (error as any)?.message || "Erreur inconnue.",
      details: error,
    };

  } catch (exception) {
    return {
      type: "handler_failure",
      message: "Erreur lors du traitement de l'erreur.",
      details: exception,
    };
  }
}
