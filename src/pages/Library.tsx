import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import QuoteCard from "@/components/QuoteCard";
import BottomNav from "@/components/BottomNav";

const allQuotes = [
  {
    content: "우리가 바라는 것은 완벽한 삶이 아니라, 완전한 삶이다.",
    bookTitle: "죽음의 수용소에서",
    author: "빅터 프랭클",
    thoughts: "오늘 아침 산책하며 떠오른 문장",
    isFavorite: true,
  },
  {
    content: "The only way to do great work is to love what you do.",
    bookTitle: "Steve Jobs",
    author: "Walter Isaacson",
    isFavorite: false,
  },
  {
    content: "결국 우리는 모두 이야기가 된다.",
    bookTitle: "어린 왕자",
    author: "생텍쥐페리",
    thoughts: "비 오는 밤에 읽었다",
    isFavorite: true,
  },
  {
    content: "삶이 있는 한, 희망도 있다.",
    bookTitle: "마르틴 루터 킹",
    author: "마르틴 루터 킹",
    isFavorite: false,
  },
  {
    content: "진정한 발견의 여행은 새로운 풍경을 찾는 것이 아니라, 새로운 눈을 갖는 것이다.",
    bookTitle: "잃어버린 시간을 찾아서",
    author: "마르셀 프루스트",
    thoughts: "여행 중 생각난 문장",
    isFavorite: true,
  },
  {
    content: "모든 행복한 가정은 서로 닮았고, 불행한 가정은 저마다의 이유로 불행하다.",
    bookTitle: "안나 카레니나",
    author: "레프 톨스토이",
    isFavorite: false,
  },
];

const Library = () => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "favorites">("all");

  const filtered = allQuotes.filter((q) => {
    const matchesQuery =
      !query ||
      q.content.toLowerCase().includes(query.toLowerCase()) ||
      q.bookTitle?.toLowerCase().includes(query.toLowerCase()) ||
      q.author?.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" || q.isFavorite;
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="max-w-lg mx-auto px-5 pt-12 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-foreground text-2xl font-semibold font-display">
            서재
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {allQuotes.length}개의 문장
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl flex items-center gap-3 px-4 py-3 mb-4"
        >
          <Search size={16} className="text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="문장, 책, 저자 검색..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none"
          />
          <button className="p-1">
            <SlidersHorizontal size={14} className="text-muted-foreground" />
          </button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2 mb-6"
        >
          {(["all", "favorites"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f
                  ? "bg-accent text-accent-foreground"
                  : "glass text-muted-foreground"
              }`}
            >
              {f === "all" ? "전체" : "즐겨찾기"}
            </button>
          ))}
        </motion.div>

        {/* Results */}
        <div className="space-y-3">
          {filtered.length > 0 ? (
            filtered.map((quote, i) => (
              <QuoteCard key={i} {...quote} index={i} />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <p className="text-muted-foreground text-sm">
                검색 결과가 없어요
              </p>
            </motion.div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Library;
