"use client";

import { ThemeProvider } from "next-themes";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

export function Providers({ children }: { children: React.ReactNode }) {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {recaptchaSiteKey ? (
        <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
          {children}
        </GoogleReCaptchaProvider>
      ) : (
        children
      )}
    </ThemeProvider>
  );
}

