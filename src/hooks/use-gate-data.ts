/**
 * GATE Grind - React Query Hooks for Client & Lovable UI
 * =======================================================
 * Simple, declarative hooks connecting frontend components
 * directly to the type-safe TanStack Start server functions.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCurrentUser,
  fetchSubjects,
  fetchSubjectTopics,
  fetchQuestions,
  fetchQuestion,
  fetchPastPaperYears,
  submitQuestionAttempt,
  toggleQuestionBookmark,
  fetchUserAnalytics,
  startMockExam,
  submitMockExam,
} from "../server/functions";
import type { QuestionFilterOptions } from "../server/catalog";

// 1. Current user & session
export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "currentUser"],
    queryFn: () => getCurrentUser(),
    staleTime: 5 * 60 * 1000,
  });
}

// 2. Catalog: Subjects list
export function useSubjects() {
  return useQuery({
    queryKey: ["catalog", "subjects"],
    queryFn: () => fetchSubjects(),
    staleTime: 10 * 60 * 1000,
  });
}

// 3. Catalog: Topics by subject
export function useTopics(subjectSlug?: string) {
  return useQuery({
    queryKey: ["catalog", "topics", subjectSlug],
    queryFn: () => fetchSubjectTopics({ data: { subjectSlug: subjectSlug! } }),
    enabled: Boolean(subjectSlug),
    staleTime: 10 * 60 * 1000,
  });
}

// 4. Questions with pagination and filters
export function useQuestions(filters: QuestionFilterOptions) {
  return useQuery({
    queryKey: ["catalog", "questions", filters],
    queryFn: () => fetchQuestions({ data: filters }),
    staleTime: 2 * 60 * 1000,
  });
}

// 5. Single question by ID or code
export function useQuestion(questionId?: string) {
  return useQuery({
    queryKey: ["catalog", "question", questionId],
    queryFn: () => fetchQuestion({ data: { questionId: questionId! } }),
    enabled: Boolean(questionId),
    staleTime: 5 * 60 * 1000,
  });
}

// 6. Exam years
export function usePastPaperYears() {
  return useQuery({
    queryKey: ["catalog", "pastPaperYears"],
    queryFn: () => fetchPastPaperYears(),
    staleTime: 30 * 60 * 1000,
  });
}

// 7. Submit question attempt
export function useSubmitAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      questionId: string;
      selectedAnswer: string;
      timeTakenSeconds: number;
      mode?: "study" | "mock" | "paper";
    }) => submitQuestionAttempt({ data }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["catalog", "question", vars.questionId] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["catalog", "subjects"] });
    },
  });
}

// 8. Toggle question bookmark
export function useToggleBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { questionId: string; note?: string }) =>
      toggleQuestionBookmark({ data }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["catalog", "question", vars.questionId] });
      queryClient.invalidateQueries({ queryKey: ["catalog", "questions"] });
    },
  });
}

// 9. User preparation analytics
export function useUserAnalytics() {
  return useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => fetchUserAnalytics(),
    staleTime: 60 * 1000,
  });
}

// 10. Generate mock exam
export function useStartMockExam() {
  return useMutation({
    mutationFn: (data: {
      type: "full" | "subject" | "topic";
      subjectSlug?: string;
      topicSlug?: string;
    }) => startMockExam({ data }),
  });
}

// 11. Submit mock exam
export function useSubmitMockExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      mockId: string;
      timeTakenSeconds: number;
      answers: Record<string, string>;
    }) => submitMockExam({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["catalog", "subjects"] });
    },
  });
}
