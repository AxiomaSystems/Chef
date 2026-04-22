"use client";

import { useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>,
          ) => void;
        };
      };
    };
  }
}

type GoogleCredentialResponse = {
  credential: string;
};

type GoogleSigninButtonProps = {
  contextLabel?: string;
};

let googleScriptPromise: Promise<void> | null = null;
let initializedClientId: string | null = null;
let googleCredentialHandler: ((credential: string) => void) | null = null;

function loadGoogleScript() {
  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existingScript) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Identity Services.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Identity Services."));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export function GoogleSigninButton({
  contextLabel = "Continue with Google",
}: GoogleSigninButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const buttonId = useId();
  const buttonContainerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    const resolvedClientId: string = clientId;

    let isCancelled = false;

    googleCredentialHandler = async (credential: string) => {
      setIsLoading(true);
      setError(undefined);

      try {
        const response = await fetch("/api/auth/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id_token: credential,
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string; redirectTo?: string }
          | null;

        if (!response.ok || !payload?.redirectTo) {
          setError(payload?.error ?? "Unable to continue with Google.");
          return;
        }

        window.location.assign(payload.redirectTo);
      } catch {
        setError("Unable to continue with Google.");
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    async function mountGoogleButton() {
      try {
        await loadGoogleScript();

        if (
          isCancelled ||
          !window.google?.accounts?.id ||
          !buttonContainerRef.current
        ) {
          return;
        }

        if (initializedClientId !== resolvedClientId) {
          window.google.accounts.id.initialize({
            client_id: resolvedClientId,
            callback: (response) => {
              googleCredentialHandler?.(response.credential);
            },
          });

          initializedClientId = resolvedClientId;
        }

        buttonContainerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          type: "standard",
          theme: "outline",
          shape: "pill",
          text: "continue_with",
          size: "large",
          width: 320,
          logo_alignment: "left",
        });
      } catch (mountError) {
        setError(
          mountError instanceof Error
            ? mountError.message
            : "Unable to load Google sign-in.",
        );
      }
    }

    mountGoogleButton();

    return () => {
      isCancelled = true;
      googleCredentialHandler = null;
    };
  }, [clientId]);

  if (!clientId) {
    return (
      <div className="rounded-2xl border border-[#d7c2b9] bg-[#faf9f6]/60 px-4 py-3 text-sm text-[#85736c]">
        Google sign-in is unavailable until{" "}
        <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> is configured.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#d7c2b9]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#85736c]">
          {contextLabel}
        </span>
        <div className="h-px flex-1 bg-[#d7c2b9]" />
      </div>

      <div className="grid justify-items-start gap-3">
        <div
          id={buttonId}
          ref={buttonContainerRef}
          className={isLoading ? "pointer-events-none opacity-70" : undefined}
        />

        {isLoading ? (
          <p className="text-sm text-[#85736c]">
            Finishing Google sign-in...
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/10 px-4 py-3 text-sm text-[#ba1a1a]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
