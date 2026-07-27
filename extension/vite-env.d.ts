/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PULLDECK_CLIENT_SECRET: string;
  readonly VITE_PULLDECK_SERVER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
