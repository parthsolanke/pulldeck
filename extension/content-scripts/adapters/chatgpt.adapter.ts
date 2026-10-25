import type { PlatformAdapter } from "./adapter.interface";
import * as composeTag from "../compose-tag";
import * as composeEvents from "../compose-events";

// The rebuilt composer dropped every data-testid; type="submit" distinguishes
// send from the voice button sharing its slot, without matching locale-dependent label text.
const SEND_BUTTON_SELECTOR = '[data-testid="send-button"], button[type="submit"]';

export const chatgptAdapter: PlatformAdapter = {
  name: "chatgpt",

  isChatRoute() {
    const path = location.pathname;
    return path === "/" || path.startsWith("/c/") || path.startsWith("/g/");
  },

  findComposeBox() {
    // ChatGPT rebuilt the composer and dropped #prompt-textarea; both are matched while the old build may still be served.
    return document.querySelector<HTMLElement>(
      '#prompt-textarea, div.ProseMirror[contenteditable="true"][role="textbox"]',
    );
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
    composeEvents.onSend(() => this.findComposeBox(), SEND_BUTTON_SELECTOR, callback);
  },

  onBeforeSend(callback) {
    composeEvents.onSend(() => this.findComposeBox(), SEND_BUTTON_SELECTOR, callback);
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
