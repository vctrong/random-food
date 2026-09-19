"use client";

import { useCallback, useMemo, useState } from "react";
import { getMyContributions } from "@/services/contributionService";
import {
  filterContributions,
  getContributorLevel,
  sortContributions,
  summarizeContributions,
} from "@/features/contributions/contributionLogic";
import type { AchievementStatus, Contribution, ContributionSort, ContributionTab } from "@/types/contribution";

export const CONTRIBUTIONS_PAGE_SIZE = 5;

export function useContributions(initialContributions: Contribution[], initialAchievements: AchievementStatus[]) {
  const [contributions, setContributions] = useState(initialContributions);
  const [achievements, setAchievements] = useState(initialAchievements);
  const [tab, setTabState] = useState<ContributionTab>("all");
  const [search, setSearchState] = useState("");
  const [sort, setSortState] = useState<ContributionSort>("newest");
  const [page, setPage] = useState(1);

  const summary = useMemo(() => summarizeContributions(contributions), [contributions]);
  const levelProgress = useMemo(() => getContributorLevel(summary.approved), [summary.approved]);

  const filtered = useMemo(
    () => sortContributions(filterContributions(contributions, tab, search), sort),
    [contributions, tab, search, sort],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / CONTRIBUTIONS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * CONTRIBUTIONS_PAGE_SIZE, currentPage * CONTRIBUTIONS_PAGE_SIZE);

  // Đổi bộ lọc luôn về trang 1 để không đứng ở trang không còn dữ liệu.
  const setTab = useCallback((next: ContributionTab) => {
    setTabState(next);
    setPage(1);
  }, []);
  const setSearch = useCallback((next: string) => {
    setSearchState(next);
    setPage(1);
  }, []);
  const setSort = useCallback((next: ContributionSort) => {
    setSortState(next);
    setPage(1);
  }, []);

  /** Tải lại từ server sau khi nộp lại — trạng thái/level/thành tựu đều tính lại từ dữ liệu mới. */
  const refresh = useCallback(async () => {
    const latest = await getMyContributions();
    if (latest) {
      setContributions(latest.contributions);
      setAchievements(latest.achievements);
    }
  }, []);

  return {
    contributions,
    summary,
    levelProgress,
    achievements,
    visible,
    filteredCount: filtered.length,
    tab,
    setTab,
    search,
    setSearch,
    sort,
    setSort,
    page: currentPage,
    setPage,
    totalPages,
    refresh,
  };
}
