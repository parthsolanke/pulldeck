import type { PlatformAdapter } from "./adapter.interface";
import * as composeTag from "../compose-tag";
import * as composeEvents from "../compose-events";

export const claudeAdapter: PlatformAdapter = {
  name: "claude",

  findComposeBox() {
    return document.querySelector<HTMLElement>('[data-testid="chat-input"]');
  },

  injectText(text: string) {
    // Claude's editor is Tiptap (built on ProseMirror, same as ChatGPT's) —
    // ignores direct DOM mutation the same way; a simulated paste works.
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
    // No data-testid on Claude's send button, unlike ChatGPT's — aria-label
    // is the next-best stable attribute.
    composeEvents.onEnterToSend(() => this.findComposeBox(), callback);
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

  findTextRange(searchText) {
    const box = this.findComposeBox();
    return box ? composeTag.findTextRange(box, searchText) : null;
  },
};
