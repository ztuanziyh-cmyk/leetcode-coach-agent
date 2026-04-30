"use client";

type SupabaseLikeError = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export function getSupabaseErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return {
      message: null,
      code: null,
      details: null,
      hint: null,
    };
  }

  const candidate = error as SupabaseLikeError;

  return {
    message: readString(candidate.message),
    code: readString(candidate.code),
    details: readString(candidate.details),
    hint: readString(candidate.hint),
  };
}

export function getSupabaseErrorMessage(
  error: unknown,
  fallback: string,
) {
  const details = getSupabaseErrorDetails(error);
  return details.message ?? fallback;
}

export function formatSupabaseErrorForUi(
  error: unknown,
  fallback: string,
) {
  const details = getSupabaseErrorDetails(error);
  const parts = [
    details.message ?? fallback,
    details.code ? `Code: ${details.code}` : null,
    details.details ? `Details: ${details.details}` : null,
    details.hint ? `Hint: ${details.hint}` : null,
  ].filter(Boolean);

  if (parts.length === 1 && !details.message && typeof error === "object" && error) {
    return `${fallback} Request was blocked, likely due to a missing auth session or RLS.`;
  }

  return parts.join(" | ");
}

function safeStringifyError(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  try {
    return JSON.stringify(error, Object.getOwnPropertyNames(error));
  } catch {
    return null;
  }
}

export function logSupabaseError(context: string, error: unknown) {
  const details = getSupabaseErrorDetails(error);
  const serialized = safeStringifyError(error);

  console.error(context, {
    message: details.message,
    code: details.code,
    details: details.details,
    hint: details.hint,
    serialized,
    raw: error,
  });
}
