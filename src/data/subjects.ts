import type { Subject } from "@/lib/types";

const t = (id: string, name: string, questionCount: number) => ({ id, name, questionCount });

export const subjects: Subject[] = [
  {
    id: "dm", code: "DM", short: "Discrete Maths", name: "Discrete Mathematics",
    description: "Logic, sets, relations, functions, combinatorics and graph theory.", weightage: "8–10 marks",
    topics: [t("logic", "Propositional & First-Order Logic", 42), t("sets", "Sets, Relations & Functions", 38), t("combinatorics", "Combinatorics", 35), t("graphs", "Graph Theory", 47), t("groups", "Groups & Lattices", 22)],
  },
  {
    id: "em", code: "EM", short: "Eng. Maths", name: "Engineering Mathematics",
    description: "Linear algebra, calculus, probability and statistics.", weightage: "5–7 marks",
    topics: [t("linalg", "Linear Algebra", 40), t("calculus", "Calculus", 28), t("probability", "Probability & Statistics", 45)],
  },
  {
    id: "dl", code: "DL", short: "Digital Logic", name: "Digital Logic",
    description: "Boolean algebra, combinational and sequential circuits, number systems.", weightage: "4–6 marks",
    topics: [t("boolean", "Boolean Algebra & K-Maps", 34), t("comb", "Combinational Circuits", 26), t("seq", "Sequential Circuits", 30), t("numbers", "Number Representation", 29)],
  },
  {
    id: "coa", code: "COA", short: "COA", name: "Computer Organization & Architecture",
    description: "Machine instructions, ALU, pipelining, memory hierarchy and I/O.", weightage: "8–10 marks",
    topics: [t("isa", "Instructions & Addressing", 25), t("pipeline", "Pipelining", 33), t("cache", "Cache & Memory Hierarchy", 41), t("io", "I/O & DMA", 18)],
  },
  {
    id: "pds", code: "PDS", short: "Programming & DS", name: "Programming & Data Structures",
    description: "C programming, recursion, arrays, stacks, queues, linked lists, trees, heaps, graphs.", weightage: "10–12 marks",
    topics: [t("c", "C Programming", 58), t("stack", "Stacks & Queues", 31), t("trees", "Trees & BST", 44), t("heaps", "Heaps", 20), t("hashing", "Hashing", 17)],
  },
  {
    id: "algo", code: "ALGO", short: "Algorithms", name: "Algorithms",
    description: "Complexity, searching, sorting, greedy, DP, divide & conquer, graph algorithms.", weightage: "7–9 marks",
    topics: [t("asymptotic", "Asymptotic Analysis", 36), t("sorting", "Searching & Sorting", 30), t("greedy", "Greedy", 21), t("dp", "Dynamic Programming", 27), t("graphalgo", "Graph Algorithms", 39)],
  },
  {
    id: "toc", code: "TOC", short: "TOC", name: "Theory of Computation",
    description: "Regular languages, CFLs, Turing machines and undecidability.", weightage: "6–8 marks",
    topics: [t("regular", "Regular Languages & FA", 48), t("cfl", "Context-Free Languages", 35), t("tm", "Turing Machines & Decidability", 29)],
  },
  {
    id: "cd", code: "CD", short: "Compilers", name: "Compiler Design",
    description: "Lexical analysis, parsing, SDT, intermediate code and optimisation.", weightage: "4–6 marks",
    topics: [t("lexer", "Lexical Analysis", 14), t("parsing", "Parsing", 37), t("sdt", "Syntax-Directed Translation", 16), t("opt", "Code Optimisation", 12)],
  },
  {
    id: "os", code: "OS", short: "OS", name: "Operating Systems",
    description: "Processes, threads, scheduling, synchronisation, deadlock, memory and file systems.", weightage: "8–10 marks",
    topics: [t("sched", "CPU Scheduling", 34), t("sync", "Synchronisation", 31), t("deadlock", "Deadlock", 19), t("memory", "Memory Management & Paging", 40), t("fs", "File Systems & Disk", 16)],
  },
  {
    id: "dbms", code: "DBMS", short: "DBMS", name: "Databases",
    description: "ER model, relational algebra, SQL, normalisation, transactions, indexing.", weightage: "7–9 marks",
    topics: [t("er", "ER Model", 12), t("ra", "Relational Algebra & SQL", 36), t("normal", "Normalisation", 28), t("txn", "Transactions & Concurrency", 25), t("index", "Indexing & B+ Trees", 20)],
  },
  {
    id: "cn", code: "CN", short: "Networks", name: "Computer Networks",
    description: "Layering, data link, routing, IP addressing, TCP/UDP and application layer.", weightage: "7–9 marks",
    topics: [t("dll", "Data Link & MAC", 27), t("ip", "IP Addressing & Subnetting", 33), t("routing", "Routing", 18), t("tcp", "TCP / UDP & Congestion", 29), t("app", "Application Layer", 11)],
  },
  {
    id: "ga", code: "GA", short: "Aptitude", name: "General Aptitude",
    description: "Verbal, quantitative, analytical and spatial reasoning. 15 marks in every paper.", weightage: "15 marks",
    topics: [t("verbal", "Verbal Ability", 60), t("quant", "Quantitative Aptitude", 72), t("analytical", "Analytical Reasoning", 40), t("spatial", "Spatial Aptitude", 18)],
  },
];

export const subjectById = (id: string) => subjects.find((s) => s.id === id);
export const topicName = (subjectId: string, topicId: string) =>
  subjectById(subjectId)?.topics.find((t) => t.id === topicId)?.name ?? topicId;
export const totalQuestions = (s: Subject) => s.topics.reduce((n, t) => n + t.questionCount, 0);
