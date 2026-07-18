import type { PlatformAdapter } from "./adapter.interface";
import * as composeTag from "../compose-tag";

export const chatgptAdapter: PlatformAdapter = {
  name: "chatgpt",

  findComposeBox() {
    // #prompt-textarea is ChatGPT's actual compose editor (confirmed via the
    // P1-01 spike) — more precise than the generic [contenteditable="true"],
    // which risks matching an unrelated editable element elsewhere on the
    // page.
    return document.querySelector<HTMLElement>("#prompt-textarea");
  },

  injectText(text: string) {
    // ChatGPT's editor is ProseMirror-based, which keeps its own internal
    // document model separate from the DOM — direct DOM mutation (insert a
    // text node + dispatch "input") does NOT work, confirmed via the P1-01
    // spike: the text appears visually, but ProseMirror still considers the
    // document empty and Send never activates. Simulating a native paste
    // does work, since ProseMirror's own paste handler processes it through
    // the real document model. This also inserts wherever the current
    // selection is (not forced to end-of-input), so it works correctly when
    // replacing an in-progress "#query" selection, not just appending.
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

  onMessageSent(_callback: () => void) {
    // TODO: observe send-button click / Enter keypress.
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
