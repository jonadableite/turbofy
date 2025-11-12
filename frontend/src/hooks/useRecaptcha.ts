/**
 * Hook para integração com Google reCAPTCHA v3
 */

import { useEffect, useState } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

interface UseRecaptchaReturn {
  executeRecaptcha: (action: string) => Promise<string>;
  isReady: boolean;
}

export function useRecaptcha(): UseRecaptchaReturn {
  const { executeRecaptcha: executeRecaptchaLib } = useGoogleReCaptcha();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Em desenvolvimento, não bloquear submissão por ausência de reCAPTCHA
    if (executeRecaptchaLib) {
      setIsReady(true);
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      setIsReady(true);
    }
  }, [executeRecaptchaLib]);

  const executeRecaptcha = async (action: string): Promise<string> => {
    if (!executeRecaptchaLib) {
      console.warn("reCAPTCHA not ready yet");
      return "";
    }

    try {
      const token = await executeRecaptchaLib(action);
      return token;
    } catch (error) {
      console.error("Error executing reCAPTCHA:", error);
      return "";
    }
  };

  return {
    executeRecaptcha,
    isReady,
  };
}

