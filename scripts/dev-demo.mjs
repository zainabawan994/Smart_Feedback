// Demo mode: local JSON data (data/demo.json), emails printed to the log, and a dummy main admin
// (DEMO_ADMIN in src/lib/store.ts). Never touches Supabase or sends real email.
import { spawn } from "node:child_process";

const env = {
  ...process.env,
  DEMO_MODE: "1",
  DATA_FILE: "data/demo.json",
  SUPABASE_URL: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  SMTP_HOST: "",
  SUPER_ADMIN_EMAILS: "admin@smartfeedback.test", // keep in sync with DEMO_ADMIN in src/lib/store.ts
};
spawn("npx next dev -p 3011", { env, stdio: "inherit", shell: true }).on("exit", (code) => process.exit(code ?? 0));
