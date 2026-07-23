import type { PlatformAdapter } from "./adapter.interface";
import * as composeTag from "../compose-tag";
import * as composeEvents from "../compose-events";

export const chatgptAdapter: PlatformAdapter = {
  name: "chatgpt",

  isChatRoute() {
    const path = location.pathname;
    return path === "/" || path.startsWith("/c/") || path.startsWith("/g/");
  },

  findComposeBox() {
    return document.querySelector<HTMLElement>("#prompt-textarea");
  },

  injectText(text: string) {
    // ChatGPT's ProseMirror editor ignores direct DOM mutation — it keeps
    // its own document model and Send never activates. A simulated paste
    // goes through ProseMirror's real input pipeline, and lands wherever
    // the current selection is rather than forcing end-of-input.
    const box = this.findComposeBox();
    if (!box) {
      throw new Error("chatgptAdapter.injectText: compose box not found");
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
    // The send button doesn't exist until there's text (it swaps in for the
    // voice/dictation button), so click detection uses delegation.
    composeEvents.onSend(() => this.findComposeBox(), '[data-testid="send-button"]', callback);
  },

  onBeforeSend(callback) {
    composeEvents.onSend(() => this.findComposeBox(), '[data-testid="send-button"]', callback);
  },

  isReady() {
    return document.readyState === "complete";
  },

  onComposeChange(callback) {
    composeTag.onComposeChange(() => this.findComposeBox(), callback);
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
