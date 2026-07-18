export interface PlatformAdapter {
  readonly name: string;
  findComposeBox(): HTMLElement | null;
  injectText(text: string): void;
  onMessageSent(callback: () => void): void;
  isReady(): boolean;
}

// TODO: this only covers sending a fully-formed string into the compose box.
// The '#' tag autocomplete (file-tagging, pr-issue-tagging) also needs live
// caret position, the in-progress "#query" substring, and an anchor rect to
// position a dropdown against. Extend this once the autocomplete UI is
// actually built (build order step 1) rather than guessing the shape now.
