/** CSS module type declarations for the plugin's own stylesheets. */
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>
  export default classes
}
