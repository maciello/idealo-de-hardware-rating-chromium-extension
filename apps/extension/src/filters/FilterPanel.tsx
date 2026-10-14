import {
  describeQuery,
  type FilterCatalog,
  type IdealoQuery,
  KNOWN_SORT_KEYS,
  type ModelScorer,
  planRequirements,
  type Requirements,
  setPrice,
  setSort,
  setText,
  toggleFilter,
} from "@idealo-hw/idealo-query";
import {
  Accordion,
  ActionIcon,
  Alert,
  Box,
  Button,
  Checkbox,
  Code,
  Drawer,
  Group,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import {
  IconAdjustmentsHorizontal,
  IconInfoCircle,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatInteger } from "../ratings/present";
import { RequirementsSection } from "../requirements/RequirementsSection";
import { emptyRequirements, isEmpty } from "../requirements/state";
import { useDraftText } from "./draft-text";

export interface FilterPanelProps {
  opened: boolean;
  onOpenedChange: (opened: boolean) => void;
  initialQuery: () => IdealoQuery;
  /** Url that applies a query on this page type; "" when it cannot be expressed. */
  toUrl: (query: IdealoQuery) => string;
  /** False on a search page that names no category: only text, price and sort can be applied. */
  canFilter: boolean;
  loadCatalog: (query: IdealoQuery) => Promise<FilterCatalog | null>;
  /** What the requirement controls need besides the catalog; read each time the panel opens. */
  loadContext: (query: IdealoQuery) => Promise<RequirementsContext>;
  /** Where the last requirements of each category are kept. */
  requirementsStore: RequirementsStore;
  onApply: (url: string) => void;
  onOpenSettings: () => void;
}

export interface RequirementsContext {
  scorer: ModelScorer;
  /** Which PassMark exports are imported. */
  hasData: { cpu: boolean; gpu: boolean };
  /** Cheapest and dearest price of the page's result set; null when the page has no payload. */
  priceBounds: { min: number; max: number } | null;
}

export interface RequirementsStore {
  load(categoryId: string): Promise<Requirements>;
  save(categoryId: string, requirements: Requirements): Promise<void>;
}

const NO_CONTEXT: RequirementsContext = {
  scorer: () => null,
  hasData: { cpu: false, gpu: false },
  priceBounds: null,
};

const SAVE_DELAY_MS = 300;
const Z_INDEX = 2_147_483_000;

const SORT_LABELS: Readonly<Record<string, string>> = { minPrice: "Lowest price first" };

const parseBound = (raw: string | number): number | undefined =>
  raw === "" || Number.isNaN(Number(raw)) ? undefined : Number(raw);

function PriceRange({
  query,
  onChange,
}: {
  query: IdealoQuery;
  onChange: (price: { min?: number; max?: number }) => void;
}) {
  const [min, setMin] = useState<string | number>(query.price?.min ?? "");
  const [max, setMax] = useState<string | number>(query.price?.max ?? "");
  const lo = parseBound(min);
  const hi = parseBound(max);
  const inverted = lo !== undefined && hi !== undefined && lo > hi;

  useEffect(() => {
    setMin(query.price?.min ?? "");
    setMax(query.price?.max ?? "");
  }, [query.price?.min, query.price?.max]);

  const commit = (nextMin: string | number, nextMax: string | number) => {
    const a = parseBound(nextMin);
    const b = parseBound(nextMax);
    if (a !== undefined && b !== undefined && a > b) return;
    onChange({ ...(a === undefined ? {} : { min: a }), ...(b === undefined ? {} : { max: b }) });
  };

  return (
    <Group grow align="flex-start">
      <NumberInput
        label="Min price (EUR)"
        min={0}
        value={min}
        data-testid="price-min"
        onChange={(value) => {
          setMin(value);
          commit(value, max);
        }}
        error={inverted ? "Min is above max" : undefined}
      />
      <NumberInput
        label="Max price (EUR)"
        min={0}
        value={max}
        data-testid="price-max"
        onChange={(value) => {
          setMax(value);
          commit(min, value);
        }}
      />
    </Group>
  );
}

export function FilterPanel({
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
}: FilterPanelProps) {
  const targetUrl = useCallback(
    (query: IdealoQuery): string => {
      try {
        return toUrl(query);
      } catch {
        return "";
      }
    },
    [toUrl],
  );
  const open = () => onOpenedChange(true);
  const close = () => onOpenedChange(false);
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

  const effectiveCatalog = useMemo<FilterCatalog>(
    () => catalog ?? { categoryId: query.categoryId, groups: [], manufacturers: [] },
    [catalog, query.categoryId],
  );
  const selected = useMemo(() => new Set(query.filterIds), [query.filterIds]);

  const plan = useMemo(() => {
    if (catalog === null || catalog.categoryId !== query.categoryId || isEmpty(requirements)) {
      return null;
    }
    try {
      return planRequirements(requirements, catalog, query, context.scorer);
    } catch {
      return null;
    }
  }, [catalog, query, requirements, context.scorer]);
  const effectiveQuery = plan?.query ?? query;

  const needle = search.trim().toLowerCase();
  const visibleGroups = effectiveCatalog.groups
    .map((group) => ({
      ...group,
      filters: group.filters.filter((f) => f.label.toLowerCase().includes(needle)),
    }))
    .filter((group) => group.filters.length > 0);

  const summary = describeQuery(effectiveQuery, effectiveCatalog).summary;
  const url = targetUrl(effectiveQuery);
  const unchanged = url === targetUrl(startQuery);
  const sortOptions = [
    { value: "", label: "Default order" },
    ...[
      ...KNOWN_SORT_KEYS,
      ...(query.sort && !KNOWN_SORT_KEYS.some((k) => k === query.sort) ? [query.sort] : []),
    ].map((key) => ({ value: key, label: SORT_LABELS[key] ?? key })),
  ];
  const sliderPrice = canFilter && context.priceBounds !== null;

  return (
    <>
      <Tooltip label="Filter builder" position="left">
        <ActionIcon
          size={48}
          radius="xl"
          variant="filled"
          aria-label="Open filter builder"
          data-testid="filter-fab"
          data-hw-interactive=""
          onClick={open}
          style={{ position: "fixed", right: 20, bottom: 20, zIndex: Z_INDEX - 1 }}
        >
          <IconAdjustmentsHorizontal size={26} />
        </ActionIcon>
      </Tooltip>

      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        size={420}
        title={<Title order={4}>Filter builder</Title>}
        data-testid="filter-drawer"
      >
        <Stack gap="md">
          <TextInput
            label="Search text"
            placeholder="For example: laptop 32GB"
            value={shownText}
            onChange={(event) => {
              const text = event.currentTarget.value;
              setDraftText(text);
              setQuery((q) => setText(q, text === "" ? undefined : text));
            }}
            data-testid="query-text"
          />

          {!canFilter && (
            <Alert
              variant="light"
              color="gray"
              icon={<IconInfoCircle size={16} />}
              data-testid="no-category-note"
            >
              This search page does not name a category, so hardware filters cannot be applied here.
              Text, price and sort still work.
            </Alert>
          )}
          {canFilter && loaded && catalog === null && (
            <Alert
              variant="light"
              color="gray"
              icon={<IconInfoCircle size={16} />}
              data-testid="no-catalog-note"
            >
              Filters could not be read from this page. Text, price and sort still work. A page
              snapshot would help to read them: save one from the extension popup and share it.
            </Alert>
          )}

          {canFilter && catalog !== null && (
            <RequirementsSection
              catalog={catalog}
              requirements={requirements}
              plan={plan}
              scorer={context.scorer}
              hasData={context.hasData}
              priceBounds={context.priceBounds}
              pagePrice={query.price}
              onChange={changeRequirements}
              onPriceChange={() => setQuery((q) => setPrice(q, undefined))}
            />
          )}

          {!sliderPrice && (
            <PriceRange query={query} onChange={(price) => setQuery((q) => setPrice(q, price))} />
          )}

          <Select
            label="Sort"
            data={sortOptions}
            value={query.sort ?? ""}
            allowDeselect={false}
            comboboxProps={{ withinPortal: false }}
            onChange={(value) => setQuery((q) => setSort(q, value || undefined))}
            data-testid="sort-select"
          />

          <Accordion variant="contained" chevronPosition="left" multiple>
            {effectiveCatalog.groups.length > 0 && (
              <Accordion.Item value="options">
                <Accordion.Control data-testid="options-toggle">
                  Pick filters by name
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    <TextInput
                      placeholder="Search filters"
                      leftSection={<IconSearch size={16} />}
                      value={search}
                      onChange={(event) => setSearch(event.currentTarget.value)}
                      data-testid="filter-search"
                    />
                    <ScrollArea.Autosize mah={280} type="auto">
                      <Stack gap="sm">
                        {visibleGroups.map((group) => (
                          <Stack key={group.attributeId} gap={4}>
                            <Text size="xs" fw={600} c="dimmed">
                              {group.name}
                            </Text>
                            {group.filters.map((option) => (
                              <Checkbox
                                key={option.filterId}
                                size="sm"
                                label={option.label}
                                checked={selected.has(option.filterId)}
                                onChange={() => setQuery((q) => toggleFilter(q, option.filterId))}
                                data-testid={`filter-${option.filterId}`}
                              />
                            ))}
                          </Stack>
                        ))}
                      </Stack>
                    </ScrollArea.Autosize>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )}
            <Accordion.Item value="details">
              <Accordion.Control data-testid="details-toggle">Selection and link</Accordion.Control>
              <Accordion.Panel>
                <Stack gap={4}>
                  <Code block data-testid="summary">
                    {summary}
                  </Code>
                  <Code
                    block
                    data-testid="target-url"
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}
                  >
                    {url}
                  </Code>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Box
            style={{
              position: "sticky",
              bottom: 0,
              background: "var(--mantine-color-body)",
              borderTop: "1px solid var(--hw-line)",
              paddingBlock: "var(--mantine-spacing-xs)",
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap="xs" wrap="nowrap">
                <ActionIcon variant="subtle" aria-label="Open settings" onClick={onOpenSettings}>
                  <IconSettings size={18} />
                </ActionIcon>
                <Button
                  variant="default"
                  onClick={() => {
                    setQuery(startQuery);
                    changeRequirements(emptyRequirements());
                  }}
                >
                  Reset
                </Button>
              </Group>
              <Group gap="sm" wrap="nowrap">
                {plan?.hitsUpperBound != null && (
                  <Text size="sm" fw={600} data-testid="hits">
                    ≤ {formatInteger(plan.hitsUpperBound)} products
                  </Text>
                )}
                <Button
                  disabled={unchanged || url === ""}
                  onClick={() => onApply(url)}
                  data-testid="apply"
                >
                  Open
                </Button>
              </Group>
            </Group>
          </Box>
        </Stack>
      </Drawer>
    </>
  );
}
