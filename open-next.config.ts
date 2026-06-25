import type { OpenNextConfig } from "@opennextjs/cloudflare";

/**
 * Configuração estratégica para o adaptador OpenNext no Cloudflare.
 * Essencial para resolver o erro "No open-next.config.ts found".
 */
const config: OpenNextConfig = {
  default: {
    placement: "smart",
  },
};

export default config;
