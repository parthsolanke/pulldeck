import type { PlatformAdapter } from "./adapter.interface";
import * as composeTag from "../compose-tag";

export const claudeAdapter: PlatformAdapter = {
  name: "claude",

  findComposeBox() {
    // Prefer stable, semantic attributes over class names — classes are the
    // first thing to break on a redesign.
    return document.querySelector<HTMLElement>(
      '[contenteditable="true"], [role="textbox"]',
    );
  },

  injectText(_text: string) {
    // TODO: contenteditable text node insertion + native InputEvent dispatch
    // (see architecture doc's injection mechanic).
    throw new Error("claudeAdapter.injectText not implemented yet");
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
