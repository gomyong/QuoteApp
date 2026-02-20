import { motion } from "framer-motion";
import DailyQuote from "@/components/DailyQuote";
import QuoteCard from "@/components/QuoteCard";
import BottomNav from "@/components/BottomNav";

const sampleQuotes = [
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
];

const Index = () => {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "좋은 아침이에요" : hour < 18 ? "좋은 오후예요" : "좋은 저녁이에요";

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="max-w-lg mx-auto px-5 pt-12 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-muted-foreground text-sm font-medium">
            {greeting} ✦
          </h2>
          <h1 className="text-foreground text-2xl font-semibold mt-1 font-display">
            Julive
          </h1>
        </motion.div>

        {/* Daily Quote */}
        <div className="mb-8">
          <DailyQuote
            content="삶이란 속도를 높이는 것만이 전부가 아니다."
            bookTitle="간디 자서전"
            author="마하트마 간디"
          />
        </div>

        {/* Recent Quotes */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase mb-4">
            최근 기록
          </h3>
          <div className="space-y-3">
            {sampleQuotes.map((quote, i) => (
              <QuoteCard key={i} {...quote} index={i} />
            ))}
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
