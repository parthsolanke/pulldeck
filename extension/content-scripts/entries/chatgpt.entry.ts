import { chatgptAdapter } from "../adapters/chatgpt.adapter";
import { mountAdapter } from "../mount";
import { mountFileTagging } from "../../features/file-tagging";

mountAdapter(chatgptAdapter, () => mountFileTagging(chatgptAdapter));
