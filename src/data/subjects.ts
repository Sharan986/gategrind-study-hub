import type { Subject } from "@/lib/types";

const t = (id: string, name: string, questionCount: number) => ({ id, name, questionCount });

export const subjects: Subject[] = [
  {
    id: "dm",
    slug: "discrete-mathematics",
    code: "DM",
    short: "Discrete Maths",
    name: "Discrete Mathematics",
    description: "Logic, sets, relations, functions, combinatorics and graph theory.",
    weightage: "8–10 marks",
    topics: [
      t("logic", "Propositional & First-Order Logic", 85),
      t("sets", "Sets, Relations & Functions", 78),
      t("combinatorics", "Combinatorics", 74),
      t("graphs", "Graph Theory", 95),
      t("groups", "Groups & Lattices", 58),
    ],
  },
  {
    id: "em",
    slug: "engineering-mathematics",
    code: "EM",
    short: "Eng. Maths",
    name: "Engineering Mathematics",
    description: "Linear algebra, calculus, probability and statistics.",
    weightage: "5–7 marks",
    topics: [
      t("linalg", "Linear Algebra", 110),
      t("calculus", "Calculus", 86),
      t("probability", "Probability & Statistics", 110),
    ],
  },
  {
    id: "dl",
    slug: "digital-logic",
    code: "DL",
    short: "Digital Logic",
    name: "Digital Logic",
    description: "Boolean algebra, combinational and sequential circuits, number systems.",
    weightage: "4–6 marks",
    topics: [
      t("boolean", "Boolean Algebra & K-Maps", 84),
      t("comb", "Combinational Circuits", 76),
      t("seq", "Sequential Circuits", 80),
      t("numbers", "Number Representation", 73),
    ],
  },
  {
    id: "coa",
    slug: "co-architecture",
    code: "COA",
    short: "COA",
    name: "Computer Organization & Architecture",
    description: "Machine instructions, ALU, pipelining, memory hierarchy and I/O.",
    weightage: "8–10 marks",
    topics: [
      t("isa", "Instructions & Addressing", 65),
      t("pipeline", "Pipelining", 73),
      t("cache", "Cache & Memory Hierarchy", 71),
      t("io", "I/O & DMA", 42),
    ],
  },
  {
    id: "pds",
    slug: "programming-and-ds",
    code: "PDS",
    short: "Programming & DS",
    name: "Programming & Data Structures",
    description:
      "C programming, recursion, arrays, stacks, queues, linked lists, trees, heaps, graphs.",
    weightage: "10–12 marks",
    topics: [
      t("c", "C Programming", 78),
      t("stack", "Stacks & Queues", 51),
      t("trees", "Trees & BST", 54),
      t("heaps", "Heaps", 30),
      t("hashing", "Hashing", 26),
    ],
  },
  {
    id: "prog",
    slug: "programming",
    code: "PROG",
    short: "Programming",
    name: "Programming",
    description: "C programming fundamentals, control flow, functions, pointers and memory.",
    weightage: "4–6 marks",
    topics: [
      t("control-flow", "Control Flow & Loops", 38),
      t("functions", "Functions & Recursion", 35),
      t("pointers", "Pointers & Memory", 32),
      t("arrays-strings", "Arrays & Strings", 26),
    ],
  },
  {
    id: "algo",
    slug: "algorithms",
    code: "ALGO",
    short: "Algorithms",
    name: "Algorithms",
    description: "Complexity, searching, sorting, greedy, DP, divide & conquer, graph algorithms.",
    weightage: "7–9 marks",
    topics: [
      t("asymptotic", "Asymptotic Analysis", 86),
      t("sorting", "Searching & Sorting", 70),
      t("greedy", "Greedy", 51),
      t("dp", "Dynamic Programming", 67),
      t("graphalgo", "Graph Algorithms", 84),
    ],
  },
  {
    id: "toc",
    slug: "theory-of-computation",
    code: "TOC",
    short: "TOC",
    name: "Theory of Computation",
    description: "Regular languages, CFLs, Turing machines and undecidability.",
    weightage: "6–8 marks",
    topics: [
      t("regular", "Regular Languages & FA", 118),
      t("cfl", "Context-Free Languages", 95),
      t("tm", "Turing Machines & Decidability", 80),
    ],
  },
  {
    id: "cd",
    slug: "compiler-design",
    code: "CD",
    short: "Compilers",
    name: "Compiler Design",
    description: "Lexical analysis, parsing, SDT, intermediate code and optimisation.",
    weightage: "4–6 marks",
    topics: [
      t("lexer", "Lexical Analysis", 44),
      t("parsing", "Parsing", 97),
      t("sdt", "Syntax-Directed Translation", 56),
      t("opt", "Code Optimisation", 45),
    ],
  },
  {
    id: "os",
    slug: "operating-system",
    code: "OS",
    short: "OS",
    name: "Operating Systems",
    description:
      "Processes, threads, scheduling, synchronisation, deadlock, memory and file systems.",
    weightage: "8–10 marks",
    topics: [
      t("sched", "CPU Scheduling", 84),
      t("sync", "Synchronisation", 71),
      t("deadlock", "Deadlock", 59),
      t("memory", "Memory Management & Paging", 80),
      t("fs", "File Systems & Disk", 49),
    ],
  },
  {
    id: "dbms",
    slug: "databases",
    code: "DBMS",
    short: "DBMS",
    name: "Databases",
    description: "ER model, relational algebra, SQL, normalisation, transactions, indexing.",
    weightage: "7–9 marks",
    topics: [
      t("er", "ER Model", 42),
      t("ra", "Relational Algebra & SQL", 86),
      t("normal", "Normalisation", 68),
      t("txn", "Transactions & Concurrency", 55),
      t("index", "Indexing & B+ Trees", 51),
    ],
  },
  {
    id: "cn",
    slug: "computer-networks",
    code: "CN",
    short: "Networks",
    name: "Computer Networks",
    description: "Layering, data link, routing, IP addressing, TCP/UDP and application layer.",
    weightage: "7–9 marks",
    topics: [
      t("dll", "Data Link & MAC", 57),
      t("ip", "IP Addressing & Subnetting", 63),
      t("routing", "Routing", 48),
      t("tcp", "TCP / UDP & Congestion", 49),
      t("app", "Application Layer", 9),
    ],
  },
  {
    id: "ga",
    slug: "general-aptitude",
    code: "GA",
    short: "Aptitude",
    name: "General Aptitude",
    description: "Verbal, quantitative, analytical and spatial reasoning. 15 marks in every paper.",
    weightage: "15 marks",
    topics: [
      t("verbal", "Verbal Ability", 120),
      t("quant", "Quantitative Aptitude", 142),
      t("analytical", "Analytical Reasoning", 110),
      t("spatial", "Spatial Aptitude", 57),
    ],
  },
];

export const subjectById = (id: string) =>
  subjects.find((s) => s.id === id || s.slug === id || s.code.toLowerCase() === id.toLowerCase());

/**
 * Questions imported from the PYQ source use subject slugs, whereas older
 * in-app questions and links use the compact subject IDs. Treat both forms as
 * the same subject whenever a filter is applied.
 */
export const matchesSubject = (questionSubjectId: string, selectedSubject?: string) => {
  if (!selectedSubject) return true;

  const selected = subjectById(selectedSubject);
  // The source keeps standalone C-programming PYQs in a separate chapter;
  // the Browse catalog presents them under Programming & Data Structures too.
  const sourceAliases: Record<string, readonly string[]> = {
    pds: ["programming"],
  };
  return Boolean(
    questionSubjectId === selectedSubject ||
    questionSubjectId === selected?.id ||
    questionSubjectId === selected?.slug ||
    (selected ? sourceAliases[selected.id]?.includes(questionSubjectId) : false),
  );
};

// The original browse taxonomy groups several source-specific topic slugs into
// one study topic. Keep those legacy URLs useful while retaining exact matches
// for links that already use a source topic slug.
const topicAliases: Record<string, readonly string[]> = {
  "dm:logic": ["propositional-logic", "first-order-logic", "mathematical-induction"],
  "dm:sets": ["set-theory", "relations", "functions", "binary-operation", "partial-order"],
  "dm:combinatorics": [
    "combinatory",
    "counting",
    "balls-in-bins",
    "generating-functions",
    "pigeonhole-principle",
  ],
  "dm:graphs": [
    "graph-connectivity",
    "graph-planarity",
    "graph-coloring",
    "graph-isomorphism",
    "graph-matching",
    "degree-of-graph",
    "graph-algorithms",
  ],
  "dm:groups": ["group-theory", "lattice"],
  "em:linalg": [
    "matrix",
    "determinant",
    "rank-of-matrix",
    "vector-space",
    "eigen-value",
    "system-of-equations",
  ],
  "em:calculus": ["limits", "continuity", "differentiation", "integration", "maxima-minima"],
  "em:probability": [
    "probability",
    "expectation",
    "conditional-probability",
    "random-variable",
    "independent-events",
    "statistics",
  ],
  "dl:boolean": [
    "boolean-algebra",
    "k-map",
    "canonical-normal-form",
    "min-sum-of-products-form",
    "functional-completeness",
  ],
  "dl:comb": ["circuit-output", "digital-circuits", "multiplexer", "adder"],
  "dl:seq": [
    "flip-flop",
    "digital-counter",
    "finite-state-machines",
    "synchronous-asynchronous-circuits",
  ],
  "dl:numbers": [
    "number-representation",
    "ieee-representation",
    "floating-point-representation",
    "booths-algorithm",
  ],
  "coa:isa": [
    "machine-instruction",
    "instruction-format",
    "instruction-execution",
    "addressing-modes",
  ],
  "coa:pipeline": ["pipelining", "data-dependency", "stall", "speedup"],
  "coa:cache": ["cache-memory", "direct-mapping", "average-memory-access-time"],
  "coa:io": ["io-handling", "interrupts", "dma", "memory-interfacing"],
  "pds:c": ["programming-in-c"],
  "pds:stack": ["stack", "queue"],
  "pds:trees": ["tree", "binary-tree", "binary-search-tree", "avl-tree"],
  "pds:heaps": ["binary-heap", "priority-queue"],
  "pds:hashing": ["hashing", "uniform-hashing"],
  "prog:control-flow": ["goto", "switch-case", "programming-constructs", "loop-invariants"],
  "prog:functions": ["functions", "recursion", "parameter-passing"],
  "prog:pointers": ["pointers", "aliasing"],
  "prog:arrays-strings": ["array", "strings"],
  "algo:asymptotic": ["asymptotic-notations", "time-complexity", "recurrence-relation"],
  "algo:sorting": ["sorting", "quick-sort", "searching"],
  "algo:greedy": ["greedy-algorithms", "huffman-code", "minimum-spanning-tree"],
  "algo:dp": ["dynamic-programming"],
  "algo:graphalgo": [
    "graph-algorithms",
    "graph-search",
    "shortest-path",
    "dijkstras-algorithm",
    "topological-sort",
  ],
  "toc:regular": [
    "regular-language",
    "regular-expression",
    "finite-automata",
    "closure-property",
    "pumping-lemma",
  ],
  "toc:cfl": [
    "context-free-language",
    "context-free-grammar",
    "pushdown-automata",
    "regular-grammar",
  ],
  "toc:tm": ["decidability", "recursive-and-recursively-enumerable-languages", "reduction"],
  "cd:lexer": ["lexical-analysis", "compilation-phases"],
  "cd:parsing": [
    "parsing",
    "grammar",
    "lr-parser",
    "ll-parser",
    "operator-precedence",
    "first-and-follow",
  ],
  "cd:sdt": ["syntax-directed-translation", "intermediate-code"],
  "cd:opt": [
    "code-optimization",
    "register-allocation",
    "live-variable-analysis",
    "static-single-assignment",
  ],
  "os:sched": ["process-scheduling", "threads", "context-switch"],
  "os:sync": ["process-synchronization", "semaphore", "precedence-graph"],
  "os:deadlock": ["resource-allocation", "deadlock-prevention-avoidance-detection"],
  "os:memory": ["virtual-memory", "memory-management", "page-replacement", "demand-paging"],
  "os:fs": ["file-system", "disk", "disk-scheduling"],
  "dbms:er": ["er-diagram", "relational-model"],
  "dbms:ra": ["relational-algebra", "relational-calculus", "sql", "joins", "query"],
  "dbms:normal": ["database-normalization", "functional-dependency", "candidate-key"],
  "dbms:txn": ["transaction-and-concurrency", "conflict-serializable", "timestamp-ordering"],
  "dbms:index": ["indexing", "b-tree"],
  "cn:dll": ["ethernet", "csma-cd", "mac-protocol", "error-detection", "sliding-window"],
  "cn:ip": ["ip-addressing", "subnetting", "ip-packet", "fragmentation"],
  "cn:routing": ["routing", "distance-vector-routing", "network-layer"],
  "cn:tcp": ["tcp", "udp", "congestion-control"],
  "cn:app": ["application-layer-protocols", "network-protocols"],
  "ga:verbal": [
    "most-appropriate-word",
    "passage-reading",
    "synonyms",
    "antonyms",
    "word-pairs",
    "tenses",
    "grammatical-error",
  ],
  "ga:quant": [
    "probability",
    "ratio-proportion",
    "percentage",
    "numerical-computation",
    "quadratic-equations",
    "logarithms",
    "venn-diagram",
  ],
  "ga:analytical": [
    "logical-reasoning",
    "verbal-reasoning",
    "statements-follow",
    "sequence-series",
  ],
  "ga:spatial": [
    "patterns-in-two-dimensions",
    "patterns-in-three-dimensions",
    "paper-folding",
    "image-rotation",
    "mirror-image",
    "direction-sense",
    "assembling-pieces",
    "assembling",
    "cubes",
    "maps",
  ],
};

export const matchesTopic = (
  questionTopicId: string,
  selectedTopic?: string,
  selectedSubject?: string,
) => {
  if (!selectedTopic) return true;
  if (questionTopicId === selectedTopic) return true;

  const subject = selectedSubject ? subjectById(selectedSubject) : undefined;
  return subject
    ? (topicAliases[`${subject.id}:${selectedTopic}`]?.includes(questionTopicId) ?? false)
    : false;
};

export const topicName = (subjectId: string, topicId: string) =>
  subjectById(subjectId)?.topics.find(
    (t) => t.id === topicId || t.name.toLowerCase() === topicId.toLowerCase(),
  )?.name ?? topicId;
export const totalQuestions = (s: Subject) => s.topics.reduce((n, t) => n + t.questionCount, 0);
