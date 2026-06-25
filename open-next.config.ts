
import { openNextConfig } from "@opennextjs/cloudflare";

/**
 * Configuração estratégica para o adaptador OpenNext no Cloudflare.
 * Essencial para resolver o erro "No open-next.config.ts found".
 */
const config = openNextConfig({
  default: {
    placement: "smart",
  },
});

export default config;
