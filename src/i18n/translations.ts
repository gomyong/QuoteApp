/**
 * Flat translation dictionary for the entire app.
 *
 * Conventions:
 *  - Keys are dot-namespaced by feature: `settings.sync`, `library.title`.
 *  - Values are plain strings; `{var}` placeholders are interpolated at
 *    call sites via `t(key, { var: ... })`.
 *  - Always add the key to all three languages. Missing keys fall through
 *    to the `ko` default (see LanguageProvider.resolve), never throw.
 *
 * Keep this file boring and exhaustive — it's the source of truth for every
 * user-facing string. Grep the app for hardcoded Korean whenever a feature
 * lands to catch drift.
 */

import type { Language } from "./config";

type Dict = Record<string, string>;

const ko: Dict = {
  // --- navigation
  "nav.home": "홈",
  "nav.library": "서재",
  "nav.capture": "기록",
  "nav.settings": "설정",

  // --- common
  "common.save": "저장",
  "common.cancel": "취소",
  "common.delete": "삭제",
  "common.edit": "수정",
  "common.share": "공유",
  "common.retry": "다시 시도",
  "common.close": "닫기",
  "common.confirm": "확인",
  "common.back": "뒤로",
  "common.loading": "불러오는 중...",
  "common.ok": "확인",

  // --- time (relative)
  "time.never": "아직 없음",
  "time.just_now": "방금 전",
  "time.seconds_ago": "{n}초 전",
  "time.minutes_ago": "{n}분 전",
  "time.hours_ago": "{n}시간 전",
  "time.days_ago": "{n}일 전",

  // --- home
  "home.brand": "Quote",
  "home.daily_title": "오늘의 문장",
  "home.shuffle": "다른 문장 보기",
  "home.recent_title": "최근 기록",
  "home.empty": "아직 저장된 문장이 없어요",
  "home.empty_cta": "첫 번째 문장을 기록해보세요",

  // --- library
  "library.title": "서재",
  "library.count": "{books}권 · 문장 {quotes}개",
  "library.empty": "아직 책이 없어요",
  "library.search_placeholder": "제목이나 저자로 검색",
  "library.unassigned": "미분류 문장",
  "library.unassigned_count": "{count}개의 문장",
  "library.last_quote_at": "최근 {time}",

  // --- capture
  "capture.title": "기록하기",
  "capture.subtitle": "한 줄의 영감을 남겨보세요",
  "capture.from_camera": "카메라",
  "capture.from_photo": "사진",
  "capture.type_directly": "직접 입력",
  "capture.quote_placeholder": "마음에 드는 구절",
  "capture.book_title_placeholder": "책 제목",
  "capture.book_author_placeholder": "저자 (선택)",
  "capture.thought_placeholder": "이 문장에 대한 생각 (선택)",
  "capture.save": "저장",
  "capture.saving": "저장 중...",
  "capture.ocr_recognizing": "텍스트 인식 중...",
  "capture.ocr_failed": "인식에 실패했어요",
  "capture.ocr_retake": "다시 찍기",
  "capture.saved": "저장되었어요",
  "capture.missing_content": "내용을 입력해 주세요",

  // --- signin
  "signin.title": "로그인",
  "signin.subtitle": "이메일로 인증 코드를 받아요",
  "signin.email_placeholder": "이메일 주소",
  "signin.send_code": "인증 코드 받기",
  "signin.sending": "전송 중...",
  "signin.code_sent": "{email}(으)로 인증 코드를 보냈어요.",
  "signin.code_hint": "{min}~{max}자리 숫자 코드를 입력해 주세요",
  "signin.code_placeholder": "인증 코드",
  "signin.verify": "인증하기",
  "signin.verifying": "인증 중...",
  "signin.back_to_email": "다른 이메일로",
  "signin.error_rate_limit": "잠시 후 다시 시도해 주세요",
  "signin.error_expired": "코드가 만료되었어요. 새 코드를 요청해 주세요",
  "signin.error_invalid_code": "잘못된 코드예요",
  "signin.error_generic": "오류가 발생했어요: {message}",

  // --- settings (account)
  "settings.title": "설정",
  "settings.account": "계정",
  "settings.not_signed_in": "로그인하지 않음 (로컬 저장만)",
  "settings.sign_in": "로그인",
  "settings.sign_out": "로그아웃",

  // --- settings (storage)
  "settings.store_images": "원본 이미지 보관",
  "settings.store_images_desc": "꺼두면 인식 후 원본은 저장하지 않아요",

  // --- settings (language)
  "settings.language": "언어",
  "settings.language_desc": "앱 표시 언어를 바꿉니다",

  // --- settings (sync panel)
  "settings.sync": "동기화",
  "settings.sync_now": "지금 동기화",
  "settings.sync_network": "네트워크",
  "settings.sync_online": "온라인",
  "settings.sync_offline": "오프라인",
  "settings.sync_login": "로그인",
  "settings.sync_login_none": "없음 (로컬만)",
  "settings.sync_last": "마지막 동기화",
  "settings.sync_pending": "대기 중 업로드",
  "settings.sync_pending_count": "{count}건",
  "settings.sync_recent": "최근 결과",

  // --- settings (cover retry)
  "settings.covers": "표지 자동 찾기 (Google Books)",
  "settings.covers_retry": "표지 다시 찾기",
  "settings.covers_searching": "찾는 중...",
  "settings.covers_desc":
    "서재에 표지가 없는 책들을 Google Books에서 다시 검색해요. 인터넷 연결이 필요합니다.",
  "settings.covers_total": "총 책",
  "settings.covers_already": "이미 표지 있음",
  "settings.covers_tried": "시도",
  "settings.covers_result": "성공 / 실패",
  "settings.covers_book_count": "{count}권",
  "settings.covers_no_books": "서재에 아직 책이 없어요. 먼저 문장을 저장해 주세요.",
  "settings.covers_match": "표지 매칭",
  "settings.covers_fail": "매칭 실패",
  "settings.covers_and_more": "...외 {count}건",

  // --- book detail
  "book.unknown_title": "제목 없음",
  "book.back_to_library": "서재로",
  "book.quote_count": "{count}개의 문장",

  // --- quote actions
  "quote.action_title": "문장 관리",
  "quote.edit": "문장 수정",
  "quote.delete_confirm": "이 문장을 삭제할까요?",
  "quote.deleted": "삭제되었어요",
  "quote.expand": "펼쳐보기",
  "quote.collapse": "접기",
  "quote.share_image": "이미지로 공유",

  // --- edit sheet
  "edit.title": "문장 수정",
  "edit.save": "저장",
  "edit.cancel": "취소",

  // --- share (Phase C placeholders, used later)
  "share.title": "이미지로 공유",
  "share.size_square": "정사각 (1080×1350)",
  "share.size_story": "스토리 (1080×1920)",
  "share.save_photo": "사진에 저장",
  "share.share": "공유",
  "share.generating": "이미지 생성 중...",
};

const en: Dict = {
  "nav.home": "Home",
  "nav.library": "Library",
  "nav.capture": "Capture",
  "nav.settings": "Settings",

  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.share": "Share",
  "common.retry": "Retry",
  "common.close": "Close",
  "common.confirm": "OK",
  "common.back": "Back",
  "common.loading": "Loading...",
  "common.ok": "OK",

  "time.never": "never",
  "time.just_now": "just now",
  "time.seconds_ago": "{n}s ago",
  "time.minutes_ago": "{n}m ago",
  "time.hours_ago": "{n}h ago",
  "time.days_ago": "{n}d ago",

  "home.brand": "Quote",
  "home.daily_title": "Quote of the Day",
  "home.shuffle": "Shuffle",
  "home.recent_title": "Recent",
  "home.empty": "No quotes saved yet",
  "home.empty_cta": "Capture your first quote",

  "library.title": "Library",
  "library.count": "{books} books · {quotes} quotes",
  "library.empty": "No books yet",
  "library.search_placeholder": "Search by title or author",
  "library.unassigned": "Unassigned quotes",
  "library.unassigned_count": "{count} quotes",
  "library.last_quote_at": "Last {time}",

  "capture.title": "Capture",
  "capture.subtitle": "Save a line of inspiration",
  "capture.from_camera": "Camera",
  "capture.from_photo": "Photo",
  "capture.type_directly": "Type",
  "capture.quote_placeholder": "Your favorite passage",
  "capture.book_title_placeholder": "Book title",
  "capture.book_author_placeholder": "Author (optional)",
  "capture.thought_placeholder": "Your thought (optional)",
  "capture.save": "Save",
  "capture.saving": "Saving...",
  "capture.ocr_recognizing": "Recognizing text...",
  "capture.ocr_failed": "Couldn't recognize text",
  "capture.ocr_retake": "Retake",
  "capture.saved": "Saved",
  "capture.missing_content": "Please enter some text",

  "signin.title": "Sign in",
  "signin.subtitle": "We'll email you a verification code",
  "signin.email_placeholder": "Email address",
  "signin.send_code": "Send code",
  "signin.sending": "Sending...",
  "signin.code_sent": "We sent a code to {email}.",
  "signin.code_hint": "Enter the {min}–{max} digit code",
  "signin.code_placeholder": "Verification code",
  "signin.verify": "Verify",
  "signin.verifying": "Verifying...",
  "signin.back_to_email": "Use another email",
  "signin.error_rate_limit": "Too many requests, try again later",
  "signin.error_expired": "Code expired — request a new one",
  "signin.error_invalid_code": "Invalid code",
  "signin.error_generic": "Something went wrong: {message}",

  "settings.title": "Settings",
  "settings.account": "Account",
  "settings.not_signed_in": "Not signed in (local only)",
  "settings.sign_in": "Sign in",
  "settings.sign_out": "Sign out",

  "settings.store_images": "Keep original photos",
  "settings.store_images_desc": "When off, photos are discarded after OCR",

  "settings.language": "Language",
  "settings.language_desc": "Change the app's display language",

  "settings.sync": "Sync",
  "settings.sync_now": "Sync now",
  "settings.sync_network": "Network",
  "settings.sync_online": "Online",
  "settings.sync_offline": "Offline",
  "settings.sync_login": "Signed in",
  "settings.sync_login_none": "No (local only)",
  "settings.sync_last": "Last sync",
  "settings.sync_pending": "Pending uploads",
  "settings.sync_pending_count": "{count}",
  "settings.sync_recent": "Recent",

  "settings.covers": "Auto covers (Google Books)",
  "settings.covers_retry": "Retry covers",
  "settings.covers_searching": "Searching...",
  "settings.covers_desc":
    "Looks up covers on Google Books for books that don't have one. Requires an internet connection.",
  "settings.covers_total": "Total books",
  "settings.covers_already": "Already have covers",
  "settings.covers_tried": "Tried",
  "settings.covers_result": "Succeeded / Failed",
  "settings.covers_book_count": "{count}",
  "settings.covers_no_books": "No books yet. Save a quote first.",
  "settings.covers_match": "matched",
  "settings.covers_fail": "no match",
  "settings.covers_and_more": "...and {count} more",

  "book.unknown_title": "Untitled",
  "book.back_to_library": "Library",
  "book.quote_count": "{count} quotes",

  "quote.action_title": "Quote",
  "quote.edit": "Edit quote",
  "quote.delete_confirm": "Delete this quote?",
  "quote.deleted": "Deleted",
  "quote.expand": "Read more",
  "quote.collapse": "Show less",
  "quote.share_image": "Share as image",

  "edit.title": "Edit quote",
  "edit.save": "Save",
  "edit.cancel": "Cancel",

  "share.title": "Share as image",
  "share.size_square": "Square (1080×1350)",
  "share.size_story": "Story (1080×1920)",
  "share.save_photo": "Save to Photos",
  "share.share": "Share",
  "share.generating": "Generating image...",
};

const ja: Dict = {
  "nav.home": "ホーム",
  "nav.library": "本棚",
  "nav.capture": "記録",
  "nav.settings": "設定",

  "common.save": "保存",
  "common.cancel": "キャンセル",
  "common.delete": "削除",
  "common.edit": "編集",
  "common.share": "共有",
  "common.retry": "再試行",
  "common.close": "閉じる",
  "common.confirm": "確認",
  "common.back": "戻る",
  "common.loading": "読み込み中...",
  "common.ok": "OK",

  "time.never": "まだありません",
  "time.just_now": "たった今",
  "time.seconds_ago": "{n}秒前",
  "time.minutes_ago": "{n}分前",
  "time.hours_ago": "{n}時間前",
  "time.days_ago": "{n}日前",

  "home.brand": "Quote",
  "home.daily_title": "今日の一節",
  "home.shuffle": "別の一節を見る",
  "home.recent_title": "最近の記録",
  "home.empty": "まだ保存された一節がありません",
  "home.empty_cta": "最初の一節を記録してみましょう",

  "library.title": "本棚",
  "library.count": "{books}冊 · {quotes}件",
  "library.empty": "まだ本がありません",
  "library.search_placeholder": "タイトルや著者で検索",
  "library.unassigned": "未分類の一節",
  "library.unassigned_count": "{count}件",
  "library.last_quote_at": "最終 {time}",

  "capture.title": "記録する",
  "capture.subtitle": "一行のインスピレーションを残しましょう",
  "capture.from_camera": "カメラ",
  "capture.from_photo": "写真",
  "capture.type_directly": "直接入力",
  "capture.quote_placeholder": "お気に入りの一節",
  "capture.book_title_placeholder": "本のタイトル",
  "capture.book_author_placeholder": "著者 (任意)",
  "capture.thought_placeholder": "この一節への感想 (任意)",
  "capture.save": "保存",
  "capture.saving": "保存中...",
  "capture.ocr_recognizing": "テキストを認識中...",
  "capture.ocr_failed": "認識に失敗しました",
  "capture.ocr_retake": "撮り直す",
  "capture.saved": "保存しました",
  "capture.missing_content": "内容を入力してください",

  "signin.title": "ログイン",
  "signin.subtitle": "メールで認証コードを送ります",
  "signin.email_placeholder": "メールアドレス",
  "signin.send_code": "コードを送る",
  "signin.sending": "送信中...",
  "signin.code_sent": "{email} に認証コードを送りました。",
  "signin.code_hint": "{min}~{max}桁の数字コードを入力してください",
  "signin.code_placeholder": "認証コード",
  "signin.verify": "認証する",
  "signin.verifying": "認証中...",
  "signin.back_to_email": "別のメールで",
  "signin.error_rate_limit": "しばらく経ってから再試行してください",
  "signin.error_expired": "コードが期限切れです。新しいコードを要求してください",
  "signin.error_invalid_code": "無効なコードです",
  "signin.error_generic": "エラーが発生しました: {message}",

  "settings.title": "設定",
  "settings.account": "アカウント",
  "settings.not_signed_in": "未ログイン (ローカル保存のみ)",
  "settings.sign_in": "ログイン",
  "settings.sign_out": "ログアウト",

  "settings.store_images": "元画像を保存",
  "settings.store_images_desc": "オフにすると認識後の元画像は保存されません",

  "settings.language": "言語",
  "settings.language_desc": "アプリの表示言語を変更します",

  "settings.sync": "同期",
  "settings.sync_now": "今すぐ同期",
  "settings.sync_network": "ネットワーク",
  "settings.sync_online": "オンライン",
  "settings.sync_offline": "オフライン",
  "settings.sync_login": "ログイン",
  "settings.sync_login_none": "なし (ローカルのみ)",
  "settings.sync_last": "最終同期",
  "settings.sync_pending": "アップロード待ち",
  "settings.sync_pending_count": "{count}件",
  "settings.sync_recent": "最近の結果",

  "settings.covers": "自動カバー (Google Books)",
  "settings.covers_retry": "カバーを再取得",
  "settings.covers_searching": "検索中...",
  "settings.covers_desc":
    "本棚にカバーのない本を Google Books で再検索します。インターネット接続が必要です。",
  "settings.covers_total": "本の合計",
  "settings.covers_already": "カバーあり",
  "settings.covers_tried": "試行",
  "settings.covers_result": "成功 / 失敗",
  "settings.covers_book_count": "{count}冊",
  "settings.covers_no_books": "本棚にまだ本がありません。まず一節を保存してください。",
  "settings.covers_match": "一致",
  "settings.covers_fail": "未一致",
  "settings.covers_and_more": "...他 {count}件",

  "book.unknown_title": "タイトルなし",
  "book.back_to_library": "本棚へ",
  "book.quote_count": "{count}件の一節",

  "quote.action_title": "一節の管理",
  "quote.edit": "一節を編集",
  "quote.delete_confirm": "この一節を削除しますか?",
  "quote.deleted": "削除しました",
  "quote.expand": "続きを読む",
  "quote.collapse": "折りたたむ",
  "quote.share_image": "画像として共有",

  "edit.title": "一節を編集",
  "edit.save": "保存",
  "edit.cancel": "キャンセル",

  "share.title": "画像として共有",
  "share.size_square": "正方形 (1080×1350)",
  "share.size_story": "ストーリー (1080×1920)",
  "share.save_photo": "写真に保存",
  "share.share": "共有",
  "share.generating": "画像生成中...",
};

export const translations: Record<Language, Dict> = { ko, en, ja };
