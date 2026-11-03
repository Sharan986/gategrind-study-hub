import type { AptitudeConcept, MockTest, Paper, SyllabusUnit } from "@/lib/types";
import { aptitudeQuestions, questions } from "./questions";
import { sourcePaperName } from "./question-origin";

const ids = (filter: (q: (typeof questions)[number]) => boolean) =>
  questions.filter(filter).map((q) => q.id);

const select = (filter: (q: (typeof questions)[number]) => boolean, count: number, offset = 0) => {
  const available = questions.filter(filter);
  return Array.from(
    { length: Math.min(count, available.length) },
    (_, i) => available[(i + offset) % available.length]!.id,
  );
};

const firstId = (filter: (q: (typeof questions)[number]) => boolean) => {
  const question = questions.find(filter);
  return question ? [question.id] : [];
};

export const papers: Paper[] = Array.from(
  questions.reduce((groups, q) => {
    if (
      !Number.isInteger(q.year) ||
      !q.sourcePaper ||
      ["PRACTICE", "UGCNET", "DS&AI SAMPLE", "unclassified"].includes(q.sourcePaper)
    )
      return groups;
    const key = `${q.sourcePaper === "CSE" ? "" : `${q.sourcePaper ?? "unclassified"}-`}${q.year}-${q.set ?? "single"}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(q);
    return groups;
  }, new Map<string, (typeof questions)[number][]>()),
)
  .map(([key, paperQuestions]) => {
    const first = paperQuestions[0]!;
    const year = first.year;
    const set = first.set;
    const sourcePaper = first.sourcePaper ?? "unclassified";
    return {
      id: key,
      year,
      ...(set ? { set } : {}),
      sourcePaper,
      title: `${sourcePaper === "unclassified" ? `GATE ${year} · paper unverified` : `GATE ${sourcePaperName(sourcePaper)} ${year}`}${set ? ` · Set ${set}` : ""}`,
      questionIds: paperQuestions.sort((a, b) => a.number - b.number).map((q) => q.id),
      durationMin: 180,
      totalMarks: paperQuestions.reduce((sum, q) => sum + q.marks, 0),
    };
  })
  .sort((a, b) => b.year - a.year || (a.set ?? 0) - (b.set ?? 0));

export const mocks: MockTest[] = [
  {
    id: "full-1",
    title: "Full Length Mock #1",
    category: "Full Length",
    description: "A 65-question CSE mock with a 100-mark distribution.",
    durationMin: 180,
    questionIds: [
      ...select(
        (q) => q.sourcePaper === "CSE" && q.subjectId === "general-aptitude" && q.marks === 1,
        5,
      ),
      ...select(
        (q) => q.sourcePaper === "CSE" && q.subjectId === "general-aptitude" && q.marks === 2,
        5,
      ),
      ...select(
        (q) => q.sourcePaper === "CSE" && q.subjectId !== "general-aptitude" && q.marks === 1,
        25,
      ),
      ...select(
        (q) => q.sourcePaper === "CSE" && q.subjectId !== "general-aptitude" && q.marks === 2,
        30,
      ),
    ],
    difficulty: "Medium",
  },
  {
    id: "full-2",
    title: "Full Length Mock #2",
    category: "Full Length",
    description: "A second 65-question CSE mock with a 100-mark distribution.",
    durationMin: 180,
    questionIds: [
      ...select(
        (q) => q.sourcePaper === "CSE" && q.subjectId === "general-aptitude" && q.marks === 1,
        5,
        5,
      ),
      ...select(
        (q) => q.sourcePaper === "CSE" && q.subjectId === "general-aptitude" && q.marks === 2,
        5,
        5,
      ),
      ...select(
        (q) => q.sourcePaper === "CSE" && q.subjectId !== "general-aptitude" && q.marks === 1,
        25,
        25,
      ),
      ...select(
        (q) => q.sourcePaper === "CSE" && q.subjectId !== "general-aptitude" && q.marks === 2,
        30,
        30,
      ),
    ],
    difficulty: "Hard",
  },
  {
    id: "sub-os",
    title: "Operating Systems Sprint",
    category: "Subject",
    description: "Verified questions on scheduling, paging, memory, and files.",
    durationMin: 30,
    questionIds: select((q) => q.subjectId === "operating-system", 20),
    difficulty: "Medium",
  },
  {
    id: "sub-algo",
    title: "Algorithms + DS",
    category: "Subject",
    description: "Verified algorithms and data-structure questions.",
    durationMin: 30,
    questionIds: select((q) => ["algorithms", "programming-and-ds"].includes(q.subjectId), 20),
    difficulty: "Medium",
  },
  {
    id: "topic-toc",
    title: "Theory Quickfire",
    category: "Topic",
    description: "Verified theory-of-computation and compiler-design questions.",
    durationMin: 25,
    questionIds: select(
      (q) => ["theory-of-computation", "compiler-design"].includes(q.subjectId),
      15,
    ),
    difficulty: "Hard",
  },
  {
    id: "apt-1",
    title: "Aptitude Drill",
    category: "Aptitude",
    description: "Verbal, quantitative, analytical, and spatial General Aptitude PYQs.",
    durationMin: 20,
    questionIds: aptitudeQuestions.slice(0, 10).map((q) => q.id),
    difficulty: "Easy",
  },
];

export const syllabus: SyllabusUnit[] = [
  {
    subjectId: "ga",
    sections: [
      {
        title: "Verbal Aptitude",
        items: [
          "Basic English grammar",
          "Vocabulary",
          "Reading and comprehension",
          "Narrative sequencing",
        ],
      },
      {
        title: "Quantitative Aptitude",
        items: [
          "Data interpretation",
          "Proportions & percentages",
          "Powers, exponents & logarithms",
          "Permutations & combinations",
        ],
      },
      {
        title: "Analytical & Spatial",
        items: [
          "Logic: deduction and induction",
          "Analogy",
          "Transformation of shapes",
          "Paper folding & cutting",
        ],
      },
    ],
  },
  {
    subjectId: "dm",
    sections: [
      { title: "Logic", items: ["Propositional logic", "First-order logic"] },
      {
        title: "Sets & Structures",
        items: ["Sets, relations, functions", "Partial orders & lattices", "Monoids, groups"],
      },
      {
        title: "Graphs & Counting",
        items: [
          "Connectivity, matching, colouring",
          "Counting, recurrence relations",
          "Generating functions",
        ],
      },
    ],
  },
  {
    subjectId: "em",
    sections: [
      {
        title: "Linear Algebra",
        items: [
          "Matrices, determinants",
          "System of linear equations",
          "Eigenvalues and eigenvectors",
          "LU decomposition",
        ],
      },
      {
        title: "Calculus",
        items: [
          "Limits, continuity, differentiability",
          "Maxima and minima",
          "Mean value theorem, integration",
        ],
      },
      {
        title: "Probability",
        items: [
          "Random variables",
          "Uniform, normal, exponential, Poisson, binomial",
          "Mean, median, mode, SD",
          "Conditional probability, Bayes",
        ],
      },
    ],
  },
  {
    subjectId: "dl",
    sections: [
      {
        title: "Digital Logic",
        items: [
          "Boolean algebra",
          "Combinational and sequential circuits",
          "Minimisation",
          "Number representations & arithmetic",
        ],
      },
    ],
  },
  {
    subjectId: "coa",
    sections: [
      {
        title: "COA",
        items: [
          "Machine instructions & addressing modes",
          "ALU, data-path and control unit",
          "Instruction pipelining, hazards",
          "Memory hierarchy: cache, main, secondary",
          "I/O interface (interrupt and DMA)",
        ],
      },
    ],
  },
  {
    subjectId: "pds",
    sections: [
      {
        title: "Programming & DS",
        items: [
          "Programming in C",
          "Recursion",
          "Arrays, stacks, queues, linked lists",
          "Trees, BSTs, binary heaps",
          "Graphs",
        ],
      },
    ],
  },
  {
    subjectId: "algo",
    sections: [
      {
        title: "Algorithms",
        items: [
          "Searching, sorting, hashing",
          "Asymptotic complexity",
          "Greedy, DP, divide-and-conquer",
          "Graph traversals, MST, shortest paths",
        ],
      },
    ],
  },
  {
    subjectId: "toc",
    sections: [
      {
        title: "TOC",
        items: [
          "Regular expressions & finite automata",
          "CFGs & push-down automata",
          "Regular & context-free languages, pumping lemma",
          "Turing machines & undecidability",
        ],
      },
    ],
  },
  {
    subjectId: "cd",
    sections: [
      {
        title: "Compiler Design",
        items: [
          "Lexical analysis, parsing, SDT",
          "Runtime environments",
          "Intermediate code generation",
          "Local optimisation, data flow analyses",
        ],
      },
    ],
  },
  {
    subjectId: "os",
    sections: [
      {
        title: "Operating Systems",
        items: [
          "System calls, processes, threads",
          "IPC, concurrency, synchronisation",
          "Deadlock",
          "CPU and I/O scheduling",
          "Memory management & virtual memory",
          "File systems",
        ],
      },
    ],
  },
  {
    subjectId: "dbms",
    sections: [
      {
        title: "Databases",
        items: [
          "ER-model",
          "Relational model: algebra, tuple calculus, SQL",
          "Integrity constraints, normal forms",
          "File organisation, indexing (B, B+ trees)",
          "Transactions and concurrency control",
        ],
      },
    ],
  },
  {
    subjectId: "cn",
    sections: [
      {
        title: "Computer Networks",
        items: [
          "Layering: OSI & TCP/IP",
          "Packet, circuit & virtual circuit switching",
          "Data link layer: framing, error detection, MAC, Ethernet bridging",
          "Routing: shortest path, flooding, DV, LS",
          "IPv4, CIDR, ARP, DHCP, ICMP, NAT",
          "TCP, UDP, sockets, congestion control",
          "DNS, SMTP, HTTP, FTP, Email",
        ],
      },
    ],
  },
];

export const aptitudeConcepts: AptitudeConcept[] = [
  {
    id: "percent",
    category: "Quantitative",
    title: "Percentages, Profit & Loss",
    summary: "Convert everything to multipliers.",
    keyPoints: [
      "x% increase → ×(1 + x/100)",
      "Successive changes multiply",
      "Profit % is on cost price",
    ],
    formula: "SP = CP\\,(1 + p/100)",
    questionIds: firstId(
      (q) => q.subjectId === "general-aptitude" && q.tags?.includes("percentage") === true,
    ),
  },
  {
    id: "ratio",
    category: "Quantitative",
    title: "Ratio & Proportion",
    summary: "Scale parts to a common total.",
    keyPoints: ["a:b = ka:kb", "Mixtures: alligation", "Partnerships: capital × time"],
    formula: "\\frac{a}{b} = \\frac{c}{d} \\Rightarrow ad = bc",
    questionIds: firstId(
      (q) => q.subjectId === "general-aptitude" && q.tags?.includes("ratio-proportion") === true,
    ),
  },
  {
    id: "pnc",
    category: "Quantitative",
    title: "Permutations & Combinations",
    summary: "Order matters, or it doesn't.",
    keyPoints: ["nPr = n!/(n−r)!", "nCr = n!/(r!(n−r)!)", "Circular arrangements: (n−1)!"],
    formula: "\\binom{n}{r} = \\frac{n!}{r!(n-r)!}",
    questionIds: firstId(
      (q) =>
        q.subjectId === "general-aptitude" &&
        q.tags?.some((tag) => tag.includes("permutation") || tag.includes("combination")) === true,
    ),
  },
  {
    id: "vocab",
    category: "Verbal",
    title: "Vocabulary & Antonyms",
    summary: "Roots, prefixes and context clues.",
    keyPoints: [
      "Eliminate options with the same tone",
      "Prefixes: in-, un-, dis-",
      "Read the full sentence",
    ],
    questionIds: firstId(
      (q) =>
        q.subjectId === "general-aptitude" &&
        q.tags?.some((tag) => ["synonyms", "antonyms", "word-pairs"].includes(tag)) === true,
    ),
  },
  {
    id: "grammar",
    category: "Verbal",
    title: "Grammar & Usage",
    summary: "Subject–verb agreement, tenses, articles.",
    keyPoints: ["Collective nouns", "Parallel structure", "Prepositions after verbs"],
    questionIds: firstId(
      (q) =>
        q.subjectId === "general-aptitude" &&
        q.tags?.some((tag) => ["tenses", "grammatical-error"].includes(tag)) === true,
    ),
  },
  {
    id: "ordering",
    category: "Analytical",
    title: "Ordering & Ranking",
    summary: "Build a chain of inequalities.",
    keyPoints: ["Write each clue as >", "Merge the chains", "Look for unique extremes"],
    questionIds: firstId(
      (q) => q.subjectId === "general-aptitude" && q.tags?.includes("logical-reasoning") === true,
    ),
  },
  {
    id: "syllogism",
    category: "Analytical",
    title: "Syllogisms",
    summary: "Venn diagrams for all/some/none.",
    keyPoints: [
      "Draw the minimum overlap",
      "‘Some’ never implies ‘all’",
      "Check every possibility",
    ],
    questionIds: [],
  },
  {
    id: "folding",
    category: "Spatial",
    title: "Paper Folding & Rotation",
    summary: "Track one corner through each step.",
    keyPoints: ["Holes mirror across fold lines", "Rotate in 90° steps", "Count symmetric copies"],
    questionIds: [],
  },
];

/** Resolves a mock id or "paper-<paperId>" into an attemptable test. */
export function getTest(
  id: string,
): { id: string; title: string; durationMin: number; questionIds: string[] } | undefined {
  if (id.startsWith("paper-")) {
    const p = papers.find((x) => x.id === id.slice(6));
    return (
      p && {
        id,
        title: p.title,
        durationMin: Math.max(10, p.questionIds.length * 3),
        questionIds: p.questionIds,
      }
    );
  }
  return mocks.find((m) => m.id === id);
}
