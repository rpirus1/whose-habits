// .sql files are bundled as text (see [[rules]] in wrangler.toml).
declare module '*.sql' {
  const text: string
  export default text
}
