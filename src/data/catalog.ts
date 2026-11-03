import type { AptitudeConcept, MockTest, Paper, SyllabusUnit } from "@/lib/types";
import { questions } from "./questions";

const ids = (filter: (q: (typeof questions)[number]) => boolean) => questions.filter(filter).map((q) => q.id);

export const papers: Paper[] = [
  { id: "2024-1", year: 2024, set: 1, title: "GATE CSE 2024 · Set 1", questionIds: ids((q) => q.year === 2024), durationMin: 180, totalMarks: 100 },
  { id: "2024-2", year: 2024, set: 2, title: "GATE CSE 2024 · Set 2", questionIds: ids((q) => q.year >= 2023), durationMin: 180, totalMarks: 100 },
  { id: "2023", year: 2023, title: "GATE CSE 2023", questionIds: ids((q) => q.year === 2023), durationMin: 180, totalMarks: 100 },
  { id: "2022", year: 2022, title: "GATE CSE 2022", questionIds: ids((q) => q.year === 2022), durationMin: 180, totalMarks: 100 },
  { id: "2021-1", year: 2021, set: 1, title: "GATE CSE 2021 · Set 1", questionIds: ids((q) => q.year === 2021), durationMin: 180, totalMarks: 100 },
  { id: "2021-2", year: 2021, set: 2, title: "GATE CSE 2021 · Set 2", questionIds: ids((q) => q.year <= 2021), durationMin: 180, totalMarks: 100 },
  { id: "2020", year: 2020, title: "GATE CSE 2020", questionIds: ids((q) => q.year === 2020 || q.subjectId === "dl"), durationMin: 180, totalMarks: 100 },
];

export const mocks: MockTest[] = [
  { id: "full-1", title: "Full Length Mock #1", category: "Full Length", description: "Covers the whole syllabus with GATE weightage and marking.", durationMin: 30, questionIds: questions.map((q) => q.id), difficulty: "Medium" },
  { id: "full-2", title: "Full Length Mock #2", category: "Full Length", description: "A harder mix that leans on core CS subjects.", durationMin: 25, questionIds: ids((q) => q.subjectId !== "ga"), difficulty: "Hard" },
  { id: "sub-os", title: "Operating Systems Sprint", category: "Subject", description: "Scheduling, paging and memory.", durationMin: 10, questionIds: ids((q) => q.subjectId === "os" || q.subjectId === "coa"), difficulty: "Medium" },
  { id: "sub-algo", title: "Algorithms + DS", category: "Subject", description: "Recurrences, trees and C tracing.", durationMin: 12, questionIds: ids((q) => ["algo", "pds"].includes(q.subjectId)), difficulty: "Medium" },
  { id: "topic-toc", title: "Theory Quickfire", category: "Topic", description: "Regular languages and parsing.", durationMin: 8, questionIds: ids((q) => ["toc", "cd"].includes(q.subjectId)), difficulty: "Hard" },
  { id: "apt-1", title: "Aptitude Drill", category: "Aptitude", description: "Verbal, quantitative and reasoning.", durationMin: 8, questionIds: ids((q) => q.subjectId === "ga"), difficulty: "Easy" },
];

export const syllabus: SyllabusUnit[] = [
  { subjectId: "ga", sections: [
    { title: "Verbal Aptitude", items: ["Basic English grammar", "Vocabulary", "Reading and comprehension", "Narrative sequencing"] },
    { title: "Quantitative Aptitude", items: ["Data interpretation", "Proportions & percentages", "Powers, exponents & logarithms", "Permutations & combinations"] },
    { title: "Analytical & Spatial", items: ["Logic: deduction and induction", "Analogy", "Transformation of shapes", "Paper folding & cutting"] },
  ]},
  { subjectId: "dm", sections: [
    { title: "Logic", items: ["Propositional logic", "First-order logic"] },
    { title: "Sets & Structures", items: ["Sets, relations, functions", "Partial orders & lattices", "Monoids, groups"] },
    { title: "Graphs & Counting", items: ["Connectivity, matching, colouring", "Counting, recurrence relations", "Generating functions"] },
  ]},
  { subjectId: "em", sections: [
    { title: "Linear Algebra", items: ["Matrices, determinants", "System of linear equations", "Eigenvalues and eigenvectors", "LU decomposition"] },
    { title: "Calculus", items: ["Limits, continuity, differentiability", "Maxima and minima", "Mean value theorem, integration"] },
    { title: "Probability", items: ["Random variables", "Uniform, normal, exponential, Poisson, binomial", "Mean, median, mode, SD", "Conditional probability, Bayes"] },
  ]},
  { subjectId: "dl", sections: [{ title: "Digital Logic", items: ["Boolean algebra", "Combinational and sequential circuits", "Minimisation", "Number representations & arithmetic"] }] },
  { subjectId: "coa", sections: [{ title: "COA", items: ["Machine instructions & addressing modes", "ALU, data-path and control unit", "Instruction pipelining, hazards", "Memory hierarchy: cache, main, secondary", "I/O interface (interrupt and DMA)"] }] },
  { subjectId: "pds", sections: [{ title: "Programming & DS", items: ["Programming in C", "Recursion", "Arrays, stacks, queues, linked lists", "Trees, BSTs, binary heaps", "Graphs"] }] },
  { subjectId: "algo", sections: [{ title: "Algorithms", items: ["Searching, sorting, hashing", "Asymptotic complexity", "Greedy, DP, divide-and-conquer", "Graph traversals, MST, shortest paths"] }] },
  { subjectId: "toc", sections: [{ title: "TOC", items: ["Regular expressions & finite automata", "CFGs & push-down automata", "Regular & context-free languages, pumping lemma", "Turing machines & undecidability"] }] },
  { subjectId: "cd", sections: [{ title: "Compiler Design", items: ["Lexical analysis, parsing, SDT", "Runtime environments", "Intermediate code generation", "Local optimisation, data flow analyses"] }] },
  { subjectId: "os", sections: [{ title: "Operating Systems", items: ["System calls, processes, threads", "IPC, concurrency, synchronisation", "Deadlock", "CPU and I/O scheduling", "Memory management & virtual memory", "File systems"] }] },
  { subjectId: "dbms", sections: [{ title: "Databases", items: ["ER-model", "Relational model: algebra, tuple calculus, SQL", "Integrity constraints, normal forms", "File organisation, indexing (B, B+ trees)", "Transactions and concurrency control"] }] },
  { subjectId: "cn", sections: [{ title: "Computer Networks", items: ["Layering: OSI & TCP/IP", "Packet, circuit & virtual circuit switching", "Data link layer: framing, error detection, MAC, Ethernet bridging", "Routing: shortest path, flooding, DV, LS", "IPv4, CIDR, ARP, DHCP, ICMP, NAT", "TCP, UDP, sockets, congestion control", "DNS, SMTP, HTTP, FTP, Email"] }] },
];

export const aptitudeConcepts: AptitudeConcept[] = [
  { id: "percent", category: "Quantitative", title: "Percentages, Profit & Loss", summary: "Convert everything to multipliers.", keyPoints: ["x% increase → ×(1 + x/100)", "Successive changes multiply", "Profit % is on cost price"], formula: "SP = CP\\,(1 + p/100)", questionIds: ["q12"] },
  { id: "ratio", category: "Quantitative", title: "Ratio & Proportion", summary: "Scale parts to a common total.", keyPoints: ["a:b = ka:kb", "Mixtures: alligation", "Partnerships: capital × time"], formula: "\\frac{a}{b} = \\frac{c}{d} \\Rightarrow ad = bc", questionIds: [] },
  { id: "pnc", category: "Quantitative", title: "Permutations & Combinations", summary: "Order matters, or it doesn't.", keyPoints: ["nPr = n!/(n−r)!", "nCr = n!/(r!(n−r)!)", "Circular arrangements: (n−1)!"], formula: "\\binom{n}{r} = \\frac{n!}{r!(n-r)!}", questionIds: [] },
  { id: "vocab", category: "Verbal", title: "Vocabulary & Antonyms", summary: "Roots, prefixes and context clues.", keyPoints: ["Eliminate options with the same tone", "Prefixes: in-, un-, dis-", "Read the full sentence"], questionIds: ["q13"] },
  { id: "grammar", category: "Verbal", title: "Grammar & Usage", summary: "Subject–verb agreement, tenses, articles.", keyPoints: ["Collective nouns", "Parallel structure", "Prepositions after verbs"], questionIds: [] },
  { id: "ordering", category: "Analytical", title: "Ordering & Ranking", summary: "Build a chain of inequalities.", keyPoints: ["Write each clue as >", "Merge the chains", "Look for unique extremes"], questionIds: ["q16"] },
  { id: "syllogism", category: "Analytical", title: "Syllogisms", summary: "Venn diagrams for all/some/none.", keyPoints: ["Draw the minimum overlap", "‘Some’ never implies ‘all’", "Check every possibility"], questionIds: [] },
  { id: "folding", category: "Spatial", title: "Paper Folding & Rotation", summary: "Track one corner through each step.", keyPoints: ["Holes mirror across fold lines", "Rotate in 90° steps", "Count symmetric copies"], questionIds: [] },
];

/** Resolves a mock id or "paper-<paperId>" into an attemptable test. */
export function getTest(id: string): { id: string; title: string; durationMin: number; questionIds: string[] } | undefined {
  if (id.startsWith("paper-")) {
    const p = papers.find((x) => x.id === id.slice(6));
    return p && { id, title: p.title, durationMin: Math.max(10, p.questionIds.length * 3), questionIds: p.questionIds };
  }
  return mocks.find((m) => m.id === id);
}
