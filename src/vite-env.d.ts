/// <reference types="vite/client" />

// CSS Modules
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.module.scss' {
  const classes: Record<string, string>;
  export default classes;
}

// Plain CSS (side-effect imports)
declare module '*.css' {
  const content: undefined;
  export default content;
}

// SVG
declare module '*.svg' {
  const src: string;
  export default src;
}
