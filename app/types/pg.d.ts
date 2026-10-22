/**
 * "pg" ships no type declarations and we do not depend on @types/pg. Only the
 * one function config/database.ts needs is declared.
 */
declare module 'pg' {
  const pg: {
    types: {
      setTypeParser(oid: number, parser: (value: string) => unknown): void
    }
  }
  export default pg
}
