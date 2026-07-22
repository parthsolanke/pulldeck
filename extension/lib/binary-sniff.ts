// Runs on already-decoded text -- a null byte survives decoding intact; an invalid sequence becomes this character instead of throwing.
const NULL_BYTE = String.fromCharCode(0x0000);
const REPLACEMENT_CHARACTER = String.fromCharCode(0xfffd);

export function looksBinaryContent(text: string): boolean {
  return text.includes(NULL_BYTE) || text.includes(REPLACEMENT_CHARACTER);
}
