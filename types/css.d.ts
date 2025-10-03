/**
 * CSS module type declarations for CateringHub
 * This file provides TypeScript support for CSS imports
 */

// Global CSS imports (like globals.css)
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

// CSS modules with .module.css extension
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

// SCSS support (if needed in the future)
declare module "*.scss" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.module.scss" {
  const classes: Record<string, string>;
  export default classes;
}

// SASS support (if needed in the future)
declare module "*.sass" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.module.sass" {
  const classes: Record<string, string>;
  export default classes;
}

// Less support (if needed in the future)
declare module "*.less" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.module.less" {
  const classes: Record<string, string>;
  export default classes;
}

// Stylus support (if needed in the future)
declare module "*.styl" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.module.styl" {
  const classes: Record<string, string>;
  export default classes;
}
