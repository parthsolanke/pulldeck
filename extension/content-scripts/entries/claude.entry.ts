import { claudeAdapter } from "../adapters/claude.adapter";
import { mountAdapter } from "../mount";
import { mountFileTagging } from "../../features/file-tagging";

mountAdapter(claudeAdapter, () => mountFileTagging(claudeAdapter));
