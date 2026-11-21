/** "ayesha.khan@gmail.com" → "ay••••@gmail.com", so pages confirm the address without showing it in full. */
export const maskEmail = (e: string) => e.replace(/^(.{1,2})[^@]*(@.*)$/, "$1••••$2");
