import { describe, expect, it } from "vitest";
import { parseRepoInput } from "../popup/parse-repo-input";

describe("parseRepoInput", () => {
  it("parses an owner/repo pair", () => {
    expect(parseRepoInput("octocat/hello-world")).toEqual({
      owner: "octocat",
      repo: "hello-world",
    });
  });

  it("strips a full https URL", () => {
    expect(parseRepoInput("https://github.com/octocat/hello-world")).toEqual({
      owner: "octocat",
      repo: "hello-world",
    });
  });

  it("strips a www URL and a .git suffix", () => {
    expect(parseRepoInput("http://www.github.com/octocat/hello-world.git")).toEqual({
      owner: "octocat",
      repo: "hello-world",
    });
  });

  it("strips trailing slashes", () => {
    expect(parseRepoInput("github.com/octocat/hello-world///")).toEqual({
      owner: "octocat",
      repo: "hello-world",
    });
  });

  it("strips the git SSH prefix", () => {
    expect(parseRepoInput("git@github.com:octocat/hello-world.git")).toEqual({
      owner: "octocat",
      repo: "hello-world",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(parseRepoInput("  octocat/hello-world  ")).toEqual({
      owner: "octocat",
      repo: "hello-world",
    });
  });

  it("returns null for incomplete input", () => {
    expect(parseRepoInput("")).toBeNull();
    expect(parseRepoInput("octocat")).toBeNull();
    expect(parseRepoInput("/hello-world")).toBeNull();
    expect(parseRepoInput("octocat/")).toBeNull();
  });
});
