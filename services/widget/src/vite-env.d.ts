/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_PRODUCTION_API: string;
  readonly VITE_PRODUCTION_API_URL: string;
  readonly VITE_LOCAL_API_URL: string;
  readonly VITE_TENANT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
