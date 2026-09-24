import { useCallback, useState } from "react";

// No 0/O, 1/I/L - they are indistinguishable in a distorted monospace image.
const CAPTCHA_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCaptchaCode(length = 6): string {
  return Array.from(
    { length },
    () => CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)],
  ).join("");
}

export function useCaptcha(enabled: boolean) {
  const [code, setCode] = useState(() => generateCaptchaCode());
  const [input, setInput] = useState("");

  const refresh = useCallback(() => {
    setCode(generateCaptchaCode());
    setInput("");
  }, []);

  const isValid = useCallback(
    () => !enabled || code === input.toUpperCase(),
    [enabled, code, input],
  );

  return { enabled, code, input, setInput, refresh, isValid };
}

export type CaptchaState = ReturnType<typeof useCaptcha>;
