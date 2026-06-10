/// <reference types="vite/client" />

// Audio asset imports — Vite resolves these to their public URL strings
declare module '*.wav' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}
