import { chatgptAdapter } from "../adapters/chatgpt.adapter";
import { mountAdapter } from "../mount";

mountAdapter(chatgptAdapter);

// Dev convenience: switch the DevTools console context dropdown (next to
// "top") to this content script, then e.g. window.__pulldeck.injectText("hi")
// — lets us manually verify adapter methods before a real UI trigger exists.
(window as unknown as { __pulldeck: typeof chatgptAdapter }).__pulldeck =
  chatgptAdapter;
