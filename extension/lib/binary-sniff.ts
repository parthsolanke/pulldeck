// Runs on already-fetched, already-UTF-8-decoded text -- unlike a
// raw-bytes sniff, this can't retry alternate encodings, but a null byte
// (code point 0) survives UTF-8 decoding intact, and an invalid byte
// sequence gets silently swapped for the replacement character (code
// point 0xFFFD) rather than throwing -- both are still reliable signals
// that the source was binary, not text.
const NULL_BYTE = String.fromCharCode(0x0000);
const REPLACEMENT_CHARACTER = String.fromCharCode(0xfffd);

export function looksBinaryContent(text: string): boolean {
  return text.includes(NULL_BYTE) || text.includes(REPLACEMENT_CHARACTER);
}
