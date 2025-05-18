declare module 'vdf-parser' {
  /**
   * Parses a VDF/ACF string into a JavaScript object.
   * @param vdfText The VDF content as a string.
   * @returns A parsed object.
   */
  export function parse<T = any>(vdfText: string): T;
}