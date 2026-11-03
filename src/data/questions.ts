import type { Question } from "@/lib/types";
import d1Questions from "./d1-questions.json";

export const demoQuestions: Question[] = [
  {
    id: "q1",
    subjectId: "algo",
    topicId: "asymptotic",
    year: 2024,
    set: 1,
    number: 12,
    type: "MCQ",
    marks: 1,
    difficulty: "Easy",
    body: "Consider the recurrence $T(n) = 2T(n/2) + n$ with $T(1) = 1$. Which of the following is the tightest bound on $T(n)$?",
    options: [
      { id: "A", text: "$\\Theta(n)$" },
      { id: "B", text: "$\\Theta(n \\log n)$" },
      { id: "C", text: "$\\Theta(n^2)$" },
      { id: "D", text: "$\\Theta(\\log n)$" },
    ],
    answer: ["B"],
    solution:
      "By the Master theorem, $a = 2$, $b = 2$, $f(n) = n = \\Theta(n^{\\log_b a})$. This is case 2, so\n\n$$T(n) = \\Theta(n \\log n)$$",
    tags: ["master-theorem"],
  },
  {
    id: "q2",
    subjectId: "pds",
    topicId: "c",
    year: 2023,
    number: 21,
    type: "NAT",
    marks: 2,
    difficulty: "Medium",
    body: "What is the value printed by the following C program?",
    code: {
      lang: "c",
      source: `#include <stdio.h>\n\nint f(int n) {\n    if (n <= 1) return 1;\n    return f(n - 1) + f(n - 2);\n}\n\nint main() {\n    printf("%d", f(6));\n    return 0;\n}`,
    },
    answer: { min: 13, max: 13 },
    solution:
      "$f(0)=f(1)=1$, then $f(2)=2, f(3)=3, f(4)=5, f(5)=8, f(6)=13$.\n\nThe program prints **13**.",
  },
  {
    id: "q3",
    subjectId: "toc",
    topicId: "regular",
    year: 2022,
    number: 7,
    type: "MSQ",
    marks: 2,
    difficulty: "Medium",
    body: "Which of the following languages over $\\Sigma = \\{a, b\\}$ are regular?",
    options: [
      { id: "A", text: "$\\{ a^n b^m \\mid n, m \\ge 0 \\}$" },
      { id: "B", text: "$\\{ a^n b^n \\mid n \\ge 0 \\}$" },
      { id: "C", text: "$\\{ w \\mid w$ has an even number of $a$'s $\\}$" },
      { id: "D", text: "$\\{ ww^R \\mid w \\in \\Sigma^* \\}$" },
    ],
    answer: ["A", "C"],
    solution:
      "**A** is $a^*b^*$, which is regular. **C** needs a 2-state DFA, so it is regular.\n\n**B** and **D** need unbounded counting or matching, which you can show with the pumping lemma. They are context-free but not regular.",
  },
  {
    id: "q4",
    subjectId: "os",
    topicId: "sched",
    year: 2024,
    set: 2,
    number: 34,
    type: "NAT",
    marks: 2,
    difficulty: "Medium",
    body: "Four processes arrive at time 0 with burst times 6, 8, 7 and 3 ms. Using SJF (non-preemptive) scheduling, what is the average waiting time in ms?",
    answer: { min: 7, max: 7 },
    solution:
      "Order: P4(3), P1(6), P3(7), P2(8). Waiting times: $0, 3, 9, 16$.\n\n$$\\text{Avg} = \\frac{0+3+9+16}{4} = 7$$",
  },
  {
    id: "q5",
    subjectId: "dbms",
    topicId: "normal",
    year: 2021,
    set: 1,
    number: 18,
    type: "MCQ",
    marks: 1,
    difficulty: "Easy",
    body: "Relation $R(A, B, C)$ has functional dependencies $A \\to B$ and $B \\to C$. The highest normal form of $R$ is:",
    options: [
      { id: "A", text: "1NF" },
      { id: "B", text: "2NF" },
      { id: "C", text: "3NF" },
      { id: "D", text: "BCNF" },
    ],
    answer: ["B"],
    solution:
      "The candidate key is $A$. $B \\to C$ is a transitive dependency of a non-prime attribute, so $R$ is not in 3NF. It has no partial dependency, so it is in **2NF**.",
  },
  {
    id: "q6",
    subjectId: "cn",
    topicId: "ip",
    year: 2023,
    number: 29,
    type: "NAT",
    marks: 1,
    difficulty: "Easy",
    body: "How many usable host addresses are there in the subnet $192.168.10.0/27$?",
    answer: { min: 30, max: 30 },
    solution: "A /27 leaves $32 - 27 = 5$ host bits, so $2^5 - 2 = 30$ usable hosts.",
  },
  {
    id: "q7",
    subjectId: "dm",
    topicId: "graphs",
    year: 2022,
    number: 3,
    type: "MCQ",
    marks: 1,
    difficulty: "Easy",
    body: "What is the maximum number of edges in a simple undirected graph with $n$ vertices that is **not** connected?",
    options: [
      { id: "A", text: "$\\binom{n}{2}$" },
      { id: "B", text: "$\\binom{n-1}{2}$" },
      { id: "C", text: "$n-1$" },
      { id: "D", text: "$\\binom{n}{2} - 1$" },
    ],
    answer: ["B"],
    solution:
      "Take a complete graph on $n-1$ vertices plus one isolated vertex. That gives $\\binom{n-1}{2}$ edges, and one more edge would make the graph connected.",
  },
  {
    id: "q8",
    subjectId: "coa",
    topicId: "cache",
    year: 2024,
    set: 1,
    number: 41,
    type: "NAT",
    marks: 2,
    difficulty: "Hard",
    body: "A 4-way set associative cache has 64 KB capacity and 32-byte blocks. The physical address is 32 bits. How many bits are in the tag field?",
    answer: { min: 18, max: 18 },
    solution:
      "Blocks $= 2^{16}/2^5 = 2^{11}$. Sets $= 2^{11}/4 = 2^9$, so the index uses 9 bits and the offset 5 bits.\n\n$$\\text{Tag} = 32 - 9 - 5 = 18$$",
  },
  {
    id: "q9",
    subjectId: "em",
    topicId: "probability",
    year: 2021,
    set: 2,
    number: 9,
    type: "MCQ",
    marks: 1,
    difficulty: "Medium",
    body: "Two fair dice are rolled. What is the probability that the sum is 7, given that at least one die shows 3?",
    options: [
      { id: "A", text: "$\\frac{2}{11}$" },
      { id: "B", text: "$\\frac{1}{6}$" },
      { id: "C", text: "$\\frac{1}{11}$" },
      { id: "D", text: "$\\frac{1}{3}$" },
    ],
    answer: ["A"],
    solution:
      "11 outcomes have at least one 3. The ones that sum to 7 are $(3,4)$ and $(4,3)$, so $P = \\frac{2}{11}$.",
  },
  {
    id: "q10",
    subjectId: "dl",
    topicId: "boolean",
    year: 2020,
    number: 15,
    type: "MCQ",
    marks: 1,
    difficulty: "Easy",
    body: "The minimised form of $F(A,B,C) = \\sum m(0, 2, 4, 6)$ is:",
    options: [
      { id: "A", text: "$\\bar{A}$" },
      { id: "B", text: "$\\bar{C}$" },
      { id: "C", text: "$\\bar{B}$" },
      { id: "D", text: "$A\\bar{C}$" },
    ],
    answer: ["B"],
    solution: "All four minterms have $C = 0$, so $F = \\bar{C}$.",
  },
  {
    id: "q11",
    subjectId: "cd",
    topicId: "parsing",
    year: 2023,
    number: 37,
    type: "MSQ",
    marks: 2,
    difficulty: "Hard",
    body: "Which of the following statements are TRUE?",
    options: [
      { id: "A", text: "Every LL(1) grammar is LALR(1)." },
      { id: "B", text: "Every LALR(1) grammar is LR(1)." },
      { id: "C", text: "An ambiguous grammar can be LR(1)." },
      { id: "D", text: "SLR(1) parsers can have more states than LALR(1) parsers." },
    ],
    answer: ["B"],
    solution:
      "**B** is true because LALR(1) ⊂ LR(1). **A** is false: some LL(1) grammars are not LALR(1). **C** is false: no ambiguous grammar is LR(k). **D** is false: SLR(1) and LALR(1) have the same number of states.",
  },
  {
    id: "q12",
    subjectId: "ga",
    topicId: "quant",
    year: 2024,
    set: 1,
    number: 4,
    type: "NAT",
    marks: 1,
    difficulty: "Easy",
    body: "A shop gives a 20% discount on the marked price and still makes a 20% profit. If the cost price is ₹400, what is the marked price in ₹?",
    answer: { min: 600, max: 600 },
    solution: "Selling price $= 1.2 \\times 400 = 480$. Marked price $= 480 / 0.8 = 600$.",
  },
  {
    id: "q13",
    subjectId: "ga",
    topicId: "verbal",
    year: 2023,
    number: 2,
    type: "MCQ",
    marks: 1,
    difficulty: "Easy",
    body: "Choose the word that is most nearly opposite in meaning to *ephemeral*.",
    options: [
      { id: "A", text: "Transient" },
      { id: "B", text: "Permanent" },
      { id: "C", text: "Fragile" },
      { id: "D", text: "Brief" },
    ],
    answer: ["B"],
    solution: "*Ephemeral* means lasting a very short time, so its opposite is **permanent**.",
  },
  {
    id: "q14",
    subjectId: "pds",
    topicId: "trees",
    year: 2022,
    number: 26,
    type: "NAT",
    marks: 2,
    difficulty: "Medium",
    body: "What is the minimum number of nodes in an AVL tree of height 5? (A single node has height 0.)",
    answer: { min: 20, max: 20 },
    solution:
      "$N(h) = N(h-1) + N(h-2) + 1$ with $N(0)=1, N(1)=2$.\n\nThis gives $N(2)=4, N(3)=7, N(4)=12, N(5)=20$.",
  },
  {
    id: "q15",
    subjectId: "os",
    topicId: "memory",
    year: 2021,
    set: 1,
    number: 44,
    type: "MCQ",
    marks: 2,
    difficulty: "Hard",
    body: "A system uses 32-bit virtual addresses, 4 KB pages and 4-byte page table entries with single-level paging. What is the size of the page table?",
    options: [
      { id: "A", text: "1 MB" },
      { id: "B", text: "4 MB" },
      { id: "C", text: "16 MB" },
      { id: "D", text: "4 KB" },
    ],
    answer: ["B"],
    solution: "Pages $= 2^{32}/2^{12} = 2^{20}$. Size $= 2^{20} \\times 4 = 4$ MB.",
  },
  {
    id: "q16",
    subjectId: "ga",
    topicId: "analytical",
    year: 2022,
    number: 8,
    type: "MCQ",
    marks: 2,
    difficulty: "Medium",
    body: "P is taller than Q. R is shorter than S but taller than P. Who is the shortest?",
    options: [
      { id: "A", text: "P" },
      { id: "B", text: "Q" },
      { id: "C", text: "R" },
      { id: "D", text: "S" },
    ],
    answer: ["B"],
    solution: "From tallest to shortest the order is $S > R > P > Q$, so **Q** is the shortest.",
  },
];

export const questions: Question[] = [...demoQuestions, ...(d1Questions as Question[])];

const questionMap = new Map<string, Question>();
for (const q of questions) {
  questionMap.set(q.id, q);
}

export const questionById = (id: string) => questionMap.get(id);

export function isCorrect(q: Question, response: string[] | string | undefined): boolean {
  if (
    response === undefined ||
    response === "" ||
    (Array.isArray(response) && response.length === 0)
  )
    return false;
  if (q.type === "NAT") {
    const v = Number(response);
    const a = q.answer as { min: number; max: number };
    return !Number.isNaN(v) && v >= a.min && v <= a.max;
  }
  const exp = [...(q.answer as string[])].sort().join(",");
  const got = [...(response as string[])].sort().join(",");
  return exp === got;
}

/** GATE marking: MCQ wrong = -1/3 (1 mark) or -2/3 (2 marks); MSQ/NAT no negative. */
export function scoreFor(q: Question, response: string[] | string | undefined): number {
  const answered = !(
    response === undefined ||
    response === "" ||
    (Array.isArray(response) && response.length === 0)
  );
  if (!answered) return 0;
  if (isCorrect(q, response)) return q.marks;
  return q.type === "MCQ" ? -q.marks / 3 : 0;
}
