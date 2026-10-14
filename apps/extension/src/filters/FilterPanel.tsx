import {
  addFilters,
  describeQuery,
  type FilterCatalog,
  filterId,
  type IdealoQuery,
  KNOWN_SORT_KEYS,
  removeFilters,
  setPrice,
  setSort,
  setText,
  toggleFilter,
} from "@idealo-hw/idealo-query";
import {
  ActionIcon,
  Alert,
  Button,
  Checkbox,
  Code,
  Drawer,
  Group,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconAdjustmentsHorizontal,
  IconInfoCircle,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface FilterPanelProps {
  opened: boolean;
  onOpenedChange: (opened: boolean) => void;
  initialQuery: () => IdealoQuery;
  /** Url that applies a query on this page type; "" when it cannot be expressed. */
  toUrl: (query: IdealoQuery) => string;
  /** False on a search page that names no category: only text, price and sort can be applied. */
  canFilter: boolean;
  loadCatalog: (query: IdealoQuery) => Promise<FilterCatalog | null>;
  onApply: (url: string) => void;
  onOpenSettings: () => void;
}

const DIGITS = /^\d+$/;
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
  const [catalog, setCatalog] = useState<FilterCatalog | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!opened) return;
    const fresh = initialQuery();
    if (targetUrl(fresh) !== targetUrl(startQuery)) {
      setStartQuery(fresh);
      setQuery(fresh);
    }
    let cancelled = false;
    void loadCatalog(fresh).then((result) => {
      if (cancelled) return;
      setCatalog(result);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [opened, initialQuery, loadCatalog, startQuery, targetUrl]);

  const effectiveCatalog = useMemo<FilterCatalog>(
    () => catalog ?? { categoryId: query.categoryId, groups: [], manufacturers: [] },
    [catalog, query.categoryId],
  );
  const known = useMemo(
    () => new Set(effectiveCatalog.groups.flatMap((g) => g.filters.map((f) => f.filterId))),
    [effectiveCatalog],
  );
  const selected = useMemo(() => new Set(query.filterIds), [query.filterIds]);
  const rawIds = query.filterIds.filter((id) => !known.has(id));

  const needle = search.trim().toLowerCase();
  const visibleGroups = effectiveCatalog.groups
    .map((group) => ({
      ...group,
      filters: group.filters.filter((f) => f.label.toLowerCase().includes(needle)),
    }))
    .filter((group) => group.filters.length > 0);

  const summary = describeQuery(query, effectiveCatalog).summary;
  const url = targetUrl(query);
  const unchanged = url === targetUrl(startQuery);
  const sortOptions = [
    { value: "", label: "Default order" },
    ...[
      ...KNOWN_SORT_KEYS,
      ...(query.sort && !KNOWN_SORT_KEYS.some((k) => k === query.sort) ? [query.sort] : []),
    ].map((key) => ({ value: key, label: SORT_LABELS[key] ?? key })),
  ];

  const changeRawIds = (next: string[]) => {
    const valid = next.filter((id) => DIGITS.test(id));
    const removed = rawIds.filter((id) => !valid.includes(id));
    const added = valid.filter((id) => !query.filterIds.some((existing) => existing === id));
    setQuery((q) => addFilters(removeFilters(q, removed.map(filterId)), added.map(filterId)));
  };

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
        title={<Title order={4}>Batch filters</Title>}
        data-testid="filter-drawer"
      >
        <Stack gap="md">
          <TextInput
            label="Search text"
            placeholder="For example: laptop 32GB"
            value={query.text ?? ""}
            onChange={(event) => {
              const text = event.currentTarget.value;
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
              This search page does not name a category, so filter ids cannot be applied here. Text,
              price and sort still work.
            </Alert>
          )}
          {canFilter && loaded && catalog === null && (
            <Alert
              variant="light"
              color="gray"
              icon={<IconInfoCircle size={16} />}
              data-testid="no-catalog-note"
            >
              Filters could not be read from this page. You can still type filter ids below and
              search by text. A page snapshot would help to read them: save one from the extension
              popup and share it.
            </Alert>
          )}

          <TextInput
            placeholder="Search filters"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            data-testid="filter-search"
          />

          <ScrollArea.Autosize mah={320} type="auto">
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

          <PriceRange query={query} onChange={(price) => setQuery((q) => setPrice(q, price))} />

          <Select
            label="Sort"
            data={sortOptions}
            value={query.sort ?? ""}
            allowDeselect={false}
            comboboxProps={{ withinPortal: false }}
            onChange={(value) => setQuery((q) => setSort(q, value || undefined))}
            data-testid="sort-select"
          />

          <TagsInput
            label="Other filter ids"
            description="Ids that are not listed above"
            disabled={!canFilter}
            placeholder="Type an id, press Enter"
            splitChars={[",", " "]}
            acceptValueOnBlur
            value={rawIds}
            onChange={changeRawIds}
            data-testid="raw-ids"
          />

          <Stack gap={4}>
            <Text size="xs" fw={600} c="dimmed">
              Selection
            </Text>
            <Code block data-testid="summary">
              {summary}
            </Code>
            <Text size="xs" fw={600} c="dimmed">
              Target
            </Text>
            <Code
              block
              data-testid="target-url"
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}
            >
              {url}
            </Code>
          </Stack>

          <Group justify="space-between">
            <Group gap="xs">
              <ActionIcon variant="subtle" aria-label="Open settings" onClick={onOpenSettings}>
                <IconSettings size={18} />
              </ActionIcon>
              <Button variant="default" onClick={() => setQuery(startQuery)}>
                Reset
              </Button>
            </Group>
            <Button
              disabled={unchanged || url === ""}
              onClick={() => onApply(url)}
              data-testid="apply"
            >
              Apply
            </Button>
          </Group>
        </Stack>
      </Drawer>
    </>
  );
}
