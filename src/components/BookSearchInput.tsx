import { useEffect, useRef, useState } from "react";
import { BookOpen, Loader2, Search, X } from "lucide-react";
import { searchBooksAutocomplete } from "@/features/books/bookSearchService";
import type { BookCandidate } from "@/features/books/types";
import type { Book } from "@/sync/types";
import { useTranslation } from "@/i18n/LanguageProvider";

export type SelectedBookMeta = {
  title: string;
  author: string | null;
  isbn: string | null;
  coverUrl: string | null;
};

type Props = {
  value: string;
  onChange: (title: string) => void;
  onSelect: (meta: SelectedBookMeta) => void;
  localBooks?: Book[];
  placeholder?: string;
  className?: string;
};

type DropdownItem = {
  key: string;
  title: string;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
  coverUrl: string | null;
  isLocal?: boolean;
};

const CoverThumb = ({ url }: { url: string | null }) => {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return <BookOpen size={13} className="text-muted-foreground" />;
  }
  return (
    <img
      src={url}
      alt=""
      className="w-full h-full object-cover"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
};

/**
 * Book title input with local-first + multi-provider live autocomplete.
 * Styled to blend into the existing Flat Navy card layout.
 */
const BookSearchInput = ({
  value,
  onChange,
  onSelect,
  localBooks = [],
  placeholder,
  className = "",
}: Props) => {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remote, setRemote] = useState<BookCandidate[]>([]);
  const suppressNextFetch = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const trimmed = value.trim();

  const localMatches: DropdownItem[] = trimmed.length >= 1
    ? localBooks
        .filter((b) => {
          const q = trimmed.toLowerCase();
          return (
            b.title.toLowerCase().includes(q) ||
            (b.author ?? "").toLowerCase().includes(q)
          );
        })
        .slice(0, 3)
        .map((b) => ({
          key: `local-${b.id}`,
          title: b.title,
          author: b.author ?? null,
          publisher: null,
          isbn: b.isbn ?? null,
          coverUrl: b.cover_url ?? null,
          isLocal: true,
        }))
    : [];

  useEffect(() => {
    if (suppressNextFetch.current) {
      suppressNextFetch.current = false;
      return;
    }
    if (!focused || trimmed.length < 2) {
      setRemote([]);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await searchBooksAutocomplete(trimmed, {
          maxResults: 6,
          signal: ac.signal,
        });
        if (!ac.signal.aborted) {
          setRemote(res);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [trimmed, focused]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const localTitles = new Set(
    localMatches.map((m) => m.title.toLowerCase().trim()),
  );
  const remoteItems: DropdownItem[] = remote
    .filter((r) => !localTitles.has(r.title.toLowerCase().trim()))
    .slice(0, 5)
    .map((r, idx) => ({
      key: `remote-${r.provider}-${r.externalId ?? idx}`,
      title: r.title,
      author: r.authors.join(", ") || null,
      publisher: r.publisher ?? null,
      isbn: r.isbn ?? null,
      coverUrl: r.coverUrl ?? null,
    }));

  const items = [...localMatches, ...remoteItems];
  const showDropdown = focused && trimmed.length >= 2 && (loading || items.length > 0);

  const handlePick = (item: DropdownItem) => {
    suppressNextFetch.current = true;
    setFocused(false);
    setRemote([]);
    onSelect({
      title: item.title,
      author: item.author,
      isbn: item.isbn,
      coverUrl: item.coverUrl,
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 border-b border-border/30 pb-2">
        <Search size={14} className="text-muted-foreground/70 shrink-0" />
        <input
          value={value}
          onFocus={() => setFocused(true)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none ${className}`}
        />
        {loading && (
          <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />
        )}
        {value && !loading && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setRemote([]);
            }}
            aria-label={t("common.close")}
            className="p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl border border-glass-border/30 bg-card shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {items.length === 0 && loading ? (
            <div className="px-3 py-3 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 size={13} className="animate-spin" />
              <span>{t("capture.book_searching")}</span>
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.key}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePick(item);
                }}
                className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-glass-border/10 transition-colors border-b border-border/20 last:border-b-0"
              >
                <div className="w-8 h-11 rounded bg-background shrink-0 overflow-hidden flex items-center justify-center">
                  <CoverThumb url={item.coverUrl} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground truncate">
                      {item.title}
                    </span>
                    {item.isLocal && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                        {t("capture.book_in_library")}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {[item.author, item.publisher].filter(Boolean).join(" · ") ||
                      t("book.unknown_title")}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default BookSearchInput;
