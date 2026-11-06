import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText } from "../components/gg/RichText";

describe("RichText component and parser", () => {
  it("renders standard inline LaTeX math expressions cleanly", () => {
    const html = renderToStaticMarkup(
      <RichText text="Let $\\alpha > 0$ and $\\varepsilon$ be arbitrary." />,
    );
    expect(html).toContain("katex");
    expect(html).toContain("katex-html");
  });

  it("renders display math blocks ($$...$$) cleanly", () => {
    const text =
      "Consider the system:\n\n$$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$$\n\nEnd of problem.";
    const html = renderToStaticMarkup(<RichText text={text} />);
    expect(html).toContain("katex-display");
    expect(html).toContain("bmatrix");
  });

  it("handles literal unescaped dollar signs in compiler grammar terminals without breaking", () => {
    const q11_4 =
      "Consider the following given grammar:\n \n" +
      "S -> Aa\nA -> BD\nB -> b| ε\nD -> d| ε  " +
      "Let a, b, d and $ be indexed as follows:   \n\n" +
      "Compute the FOLLOW set of the non-terminal B and write the index values for the symbols in the FOLLOW set in the descending order. " +
      "(For example, if the FOLLOW set is {a, b, d, $}, then the answer should be 3210).";

    const html = renderToStaticMarkup(<RichText text={q11_4} />);
    expect(html).toContain("Let a, b, d and $ be indexed");
    expect(html).toContain("{a, b, d, $}");
    // Must NOT wrap the prose in a broken KaTeX error block
    expect(html).not.toContain("katex-error");
  });

  it("handles literal dollars in option choices alongside inline math (q_vol2_2_11_2)", () => {
    const optB =
      "FIRST(A) = {a, b, $}\n\nFIRST(B) = {a, b, $\\varepsilon$}\n\nFOLLOW(A) = {a, b}\n\nFOLLOW(B) = {$}";

    const html = renderToStaticMarkup(<RichText text={optB} as="span" />);
    // Literal dollars are preserved
    expect(html).toContain("FIRST(A) = {a, b, $}");
    expect(html).toContain("FOLLOW(B) = {$}");
    // Inline \varepsilon is parsed by KaTeX
    expect(html).toContain("katex");
    // No broken error blocks
    expect(html).not.toContain("katex-error");
  });

  it("supports escaped dollar signs (\\$) and unescapes them to literal $ in rendered output", () => {
    const text = "The cost of item A is \\$100, and FOLLOW set contains {\\$}.";
    const html = renderToStaticMarkup(<RichText text={text} />);
    expect(html).toContain("The cost of item A is $100");
    expect(html).toContain("FOLLOW set contains {$}");
    expect(html).not.toContain("\\$");
    expect(html).not.toContain("katex-error");
  });

  it("preserves literal dollar signs in programming examples and options", () => {
    const codeText = "Wait(A); Print(*); If (X == 2) { Print($); Signal(B); }";
    const html = renderToStaticMarkup(<RichText text={codeText} />);
    expect(html).toContain("Print($);");
    expect(html).not.toContain("katex-error");
  });

  it("preserves literal dollar operators in compiler design questions", () => {
    const optA = "$ has higher precedence and is left associative; # is right associative";
    const html = renderToStaticMarkup(<RichText text={optA} as="span" />);
    expect(html).toContain("$ has higher precedence and is left associative");
    expect(html).not.toContain("katex-error");
  });

  it("preserves formatting with **bold** and *italic* combined with math and dollars", () => {
    const text = "This is **critical**: let $x \\in S$ and price be \\$50.";
    const html = renderToStaticMarkup(<RichText text={text} />);
    expect(html).toContain("<strong");
    expect(html).toContain("critical</strong>");
    expect(html).toContain("katex");
    expect(html).toContain("price be $50.");
  });

  it("handles adjacent math numbers correctly without collision (e.g. 1$\\leq$i$\\leq$12)", () => {
    const edgeText =
      "{(i,f):1$\\leq$i$\\leq$12, 1$\\leq$j$\\leq$12}. |a-c|$\\leq$1 and |b-d| $\\leq$1";
    const html = renderToStaticMarkup(<RichText text={edgeText} />);
    expect(html).toContain("katex");
    expect(html).not.toContain("katex-error");
  });
});
