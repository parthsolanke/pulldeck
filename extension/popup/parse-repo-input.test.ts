import { describe, expect, it } from "vitest";
import { parseRepoInput } from "./parse-repo-input";

const expected = { owner: "octocat", repo: "hello-world" };

describe("parseRepoInput", () => {
  it("parses owner/repo shorthand", () => {
    expect(parseRepoInput("octocat/hello-world")).toEqual(expected);
  });

  it("parses HTTPS GitHub URLs", () => {
    expect(parseRepoInput("https://github.com/octocat/hello-world")).toEqual(expected);
    expect(parseRepoInput("http://www.github.com/octocat/hello-world.git")).toEqual(expected);
  });

  it("parses SSH GitHub URLs", () => {
    expect(parseRepoInput("git@github.com:octocat/hello-world.git")).toEqual(expected);
  });

  it("ignores trailing slashes and surrounding whitespace", () => {
    expect(parseRepoInput("  octocat/hello-world/  ")).toEqual(expected);
  });

  it("rejects input without both parts", () => {
    expect(parseRepoInput("octocat")).toBeNull();
    expect(parseRepoInput("")).toBeNull();
    expect(parseRepoInput("   ")).toBeNull();
  });
});
