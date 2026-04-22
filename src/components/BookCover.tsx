import { useState } from "react";
import { useTranslation } from "@/i18n/LanguageProvider";

type Props = {
  coverUrl?: string | null;
  title: string;
  author?: string | null;
  /** Tailwind rounded-* class override. Default rounded-xl. */
  rounded?: string;
  /** Optional className passthrough on the outer wrapper. */
  className?: string;
  /**
   * Tailwind text-* class for the placeholder title. Defaults to text-[11px]
   * which is tuned for the small list-view thumbnails; bump this up when
   * rendering larger covers on the detail hero.
   */
  placeholderTextClass?: string;
};

/**
 * Book cover with a clean white placeholder fallback.
 *
 * When a `coverUrl` is available (and the image loads successfully) we show
 * the real cover. Otherwise we render a minimal off-white card with the
 * book's title (clamped) and author — readable at any tile size.
 *
 * Fills its parent; use with a sized aspect-[2/3] container.
 */
const BookCover = ({
  coverUrl,
  title,
  author,
  rounded = "rounded-xl",
  className,
  placeholderTextClass = "text-[11px]",
}: Props) => {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const hasImage = !!coverUrl && !failed;
  const displayTitle = title || t("book.unknown_title");

  return (
    <div
      className={
        "relative overflow-hidden " +
        rounded +
        (className ? " " + className : "")
      }
    >
      {hasImage ? (
        <img
          src={coverUrl ?? undefined}
          alt={t("book.cover_alt", { title: displayTitle })}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-white flex flex-col justify-between p-2.5">
          {/* Top-aligned title — clamp to a few lines so long titles still fit */}
          <div
            className={
              "text-neutral-900 font-medium leading-tight font-display tracking-tight line-clamp-4 break-keep " +
              placeholderTextClass
            }
          >
            {displayTitle}
          </div>
          {author && (
            <div className="text-neutral-500 text-[10px] leading-tight line-clamp-1 mt-1">
              {author}
            </div>
          )}
          {/* Thin spine accent on the left edge for a subtle book feel */}
          <div className="absolute inset-y-0 left-0 w-[2px] bg-neutral-200" />
        </div>
      )}
    </div>
  );
};

export default BookCover;
