import {
  emptyRequirements,
  type FilterCatalog,
  type IdealoQuery,
  type PriceRange,
  type Requirements,
  setPrice,
  setSort,
  setText,
  toggleFilter,
} from "@idealo-hw/idealo-query";
import { useDebouncedCallback } from "@mantine/hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SAVE_DELAY_MS } from "../config";
import { NO_CONTEXT, planOf, type RequirementsContext, safeUrl } from "../model";
import { buildFilterViewModel, type FilterActions, type FilterViewModel } from "../view-model";
import type { FilterBuilderInput } from "./types";
import { useDraftText } from "./use-draft-text";

export interface FilterBuilder {
  model: FilterViewModel;
  actions: FilterActions;
}

/**
 * Editing state of the filter builder: the query being built, the catalog and requirement context
 * read each time the panel opens, and the requirements, saved once edits settle.
 */
export function useFilterBuilder({
  opened,
  onOpenedChange,
  initialQuery,
  toUrl,
  canFilter,
  loadCatalog,
  loadContext,
  requirementsStore,
  onApply,
  onOpenSettings,
}: FilterBuilderInput): FilterBuilder {
  const targetUrl = useCallback((query: IdealoQuery): string => safeUrl(toUrl, query), [toUrl]);
  const [startQuery, setStartQuery] = useState(initialQuery);
  const [query, setQuery] = useState(startQuery);
  const [shownText, setDraftText] = useDraftText(query.text);
  const [catalog, setCatalog] = useState<FilterCatalog | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [requirements, setRequirements] = useState<Requirements>(emptyRequirements);
  const [context, setContext] = useState<RequirementsContext>(NO_CONTEXT);
  // Edits made before the stored requirements arrive win over them.
  const edited = useRef(false);

  const save = useDebouncedCallback(
    (categoryId: string, next: Requirements) =>
      void requirementsStore.save(categoryId, next).catch(() => undefined),
    { delay: SAVE_DELAY_MS, flushOnUnmount: true },
  );
  const changeRequirements = (next: Requirements): void => {
    edited.current = true;
    setRequirements(next);
    save(query.categoryId, next);
  };

  useEffect(() => {
    if (!opened) return;
    const fresh = initialQuery();
    if (targetUrl(fresh) !== targetUrl(startQuery)) {
      setStartQuery(fresh);
      setQuery(fresh);
    }
    edited.current = false;
    let cancelled = false;
    void Promise.all([
      loadCatalog(fresh),
      loadContext(fresh),
      requirementsStore.load(fresh.categoryId).catch(emptyRequirements),
    ]).then(([result, loadedContext, stored]) => {
      if (cancelled) return;
      setCatalog(result);
      setContext(loadedContext);
      if (!edited.current) setRequirements(stored);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [opened, initialQuery, loadCatalog, loadContext, requirementsStore, startQuery, targetUrl]);

  const plan = useMemo(
    () => planOf(catalog, query, requirements, context.scorer),
    [catalog, query, requirements, context.scorer],
  );
  const model = buildFilterViewModel({
    query,
    startQuery,
    catalog,
    loaded,
    canFilter,
    shownText,
    search,
    requirements,
    context,
    plan,
    urlOf: targetUrl,
  });

  const actions: FilterActions = {
    open: () => onOpenedChange(true),
    close: () => onOpenedChange(false),
    changeText: (text) => {
      setDraftText(text);
      setQuery((q) => setText(q, text === "" ? undefined : text));
    },
    changePrice: (price: PriceRange) => setQuery((q) => setPrice(q, price)),
    clearPrice: () => setQuery((q) => setPrice(q, undefined)),
    changeSort: (sort) => setQuery((q) => setSort(q, sort || undefined)),
    toggleFilter: (filterId) => setQuery((q) => toggleFilter(q, filterId)),
    searchFilters: setSearch,
    changeRequirements,
    reset: () => {
      setQuery(startQuery);
      changeRequirements(emptyRequirements());
    },
    apply: () => onApply(model.url),
    openSettings: onOpenSettings,
  };
  return { model, actions };
}
