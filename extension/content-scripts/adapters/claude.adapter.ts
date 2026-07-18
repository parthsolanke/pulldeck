import type { PlatformAdapter } from "./adapter.interface";
import * as composeTag from "../compose-tag";
import * as composeEvents from "../compose-events";

export const claudeAdapter: PlatformAdapter = {
  name: "claude",

  findComposeBox() {
    // [data-testid="chat-input"] is Claude's actual compose editor (confirmed
    // via the P1-02 spike) — a data-testid is about as stable as selectors
    // get, and more precise than the generic [contenteditable="true"], [role
    // ="textbox"], which risked matching an unrelated element on the page.
    return document.querySelector<HTMLElement>('[data-testid="chat-input"]');
  },

  injectText(text: string) {
    // Claude's editor is Tiptap (itself built on ProseMirror) — same
    // underlying engine as ChatGPT's, confirmed via the P1-02 spike. Direct
    // DOM mutation doesn't work here either, for the same reason: the
    // editor keeps its own internal document model separate from the DOM.
    // Simulating a native paste routes through Tiptap/ProseMirror's own
    // input pipeline correctly, same as chatgptAdapter.injectText.
    const box = this.findComposeBox();
    if (!box) {
      throw new Error("claudeAdapter.injectText: compose box not found");
    }

    box.focus();

    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", text);

    box.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
  },

  onMessageSent(callback) {
    // Enter-to-send needs no site-specific selector — it's a near-universal
    // chat UI convention. Claude's send button has no data-testid, unlike
    // ChatGPT's — aria-label is the next-best stable attribute.
    const box = this.findComposeBox();
    if (box) composeEvents.onEnterToSend(box, callback);
    composeEvents.onSendClick('[aria-label="Send message"]', callback);
  },

  isReady() {
    return document.readyState === "complete";
  },

  onComposeChange(callback) {
    const box = this.findComposeBox();
    if (box) composeTag.onComposeChange(box, callback);
  },

  getActiveTag() {
    const box = this.findComposeBox();
    return box ? composeTag.getActiveTag(box) : null;
  },

  getCaretRect() {
    const box = this.findComposeBox();
    return box ? composeTag.getCaretRect(box) : null;
  },
};
