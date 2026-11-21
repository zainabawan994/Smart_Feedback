import { PAYMENT_METHODS, type PaymentMethod } from "./options.ts";

/** Where owners send money. Set in .env.local (never in git); a method with no account is not offered. */
export function paymentAccounts(): { method: PaymentMethod; label: string; lines: string[] }[] {
  const e = process.env;
  const accounts: Record<PaymentMethod, string[]> = {
    bank: [e.PAYMENT_BANK_NAME, e.PAYMENT_ACCOUNT_TITLE && `Account title: ${e.PAYMENT_ACCOUNT_TITLE}`, e.PAYMENT_ACCOUNT_NUMBER && `Account / IBAN: ${e.PAYMENT_ACCOUNT_NUMBER}`].filter(Boolean) as string[],
    easypaisa: e.PAYMENT_EASYPAISA ? [`Easypaisa number: ${e.PAYMENT_EASYPAISA}`, e.PAYMENT_ACCOUNT_TITLE ? `Name: ${e.PAYMENT_ACCOUNT_TITLE}` : ""].filter(Boolean) : [],
    jazzcash: e.PAYMENT_JAZZCASH ? [`JazzCash number: ${e.PAYMENT_JAZZCASH}`, e.PAYMENT_ACCOUNT_TITLE ? `Name: ${e.PAYMENT_ACCOUNT_TITLE}` : ""].filter(Boolean) : [],
  };
  // Bank needs at least the account number to be usable.
  if (!e.PAYMENT_ACCOUNT_NUMBER) accounts.bank = [];
  return PAYMENT_METHODS.filter((m) => accounts[m.key].length).map((m) => ({ method: m.key, label: m.label, lines: accounts[m.key] }));
}
