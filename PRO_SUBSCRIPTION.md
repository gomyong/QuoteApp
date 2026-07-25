# Quote Pro — 구독 (1차)

> 상태: **코드 착수** · 스토어 상품/RevenueCat Entitlement는 Console 작업 필요  
> 가격 목표: **₩3,300 / 월** · Product ID: `app.quote.note.pro.monthly`  
> Entitlement: **`pro`**  
> 관련: [`IAP_STEP1_APPSTORE_DONATION.md`](./IAP_STEP1_APPSTORE_DONATION.md) (후원 tip은 별도 유지)

---

## 제품 방향

- Quote는 **무료**로 기록·OCR·동기화·워터마크 포함 이미지 공유.
- **Pro**는 Quote에 쌓인 독서노트를 **외부로 아카이브**하고, 공유 이미지를 더 깔끔하게 쓰는 유료 옵션.
- **가져오기(옵시디언/노션 → Quote)는 1차 범위 밖.**

---

## 1차 Pro 기능 (유료 전용)

| 기능 | 무료 | Pro |
| --- | --- | --- |
| 이미지 공유 | ✅ (워터마크 **항상** 포함) | ✅ **워터마크 제거** 가능 |
| Markdown 내보내기 | ❌ (잠금 → Pro 시트) | ✅ `.md` 공유/저장 |
| Obsidian URI | ❌ | ✅ `obsidian://new` (길면 `.md` 공유로 폴백) |
| Notion 내보내기 | ❌ | ✅ Integration Token + 부모 페이지에 페이지 생성 |

후원(tip consumable)과 Pro 구독은 **병행**. 후원은 기능 해금과 무관.

---

## UX 원칙 (Settings에 자연스럽게)

1. **계정 / 언어 바로 아래**에 `Quote Pro` 카드 — “구독”이 아니라 **아카이브·공유 품질**로 설명.
2. 무료 사용자는 기능 행이 보이되 **잠금 아이콘 + Pro 배지**. 탭 → Pro 시트 (기능 미리보기 + 구독).
3. Pro 활성 시 같은 카드가 **활성 배지 + 내보내기 액션**으로 전환 (별도 메뉴 깊이 최소화).
4. 공유 시트: 무료는 워터마크 고정 + 한 줄 업셀. Pro는 “워터마크 없이” 토글(기본 ON).
5. 후원 카드는 Pro 아래·작게 유지 — 혼동 방지 문구: “기능 해금과 무관한 응원”.

---

## 스토어 / RevenueCat 체크리스트

### App Store Connect / Play Console

- [ ] Auto-renewable subscription `app.quote.note.pro.monthly` (₩3,300 / 상응 현지화)
- [ ] 구독 그룹 생성 · 무료 체험(선택)
- [ ] 개인정보 / 데이터 안전: 구독·결제 처리 명시

### RevenueCat

- [ ] Entitlement **`pro`**
- [ ] Offering에 monthly package 연결
- [ ] iOS / Android 앱에 동일 entitlement
- [ ] (기존) tip consumables 유지

### 앱 env

```
VITE_IAP_PRO_PRODUCT_ID=app.quote.note.pro.monthly
VITE_IAP_PRO_ENTITLEMENT_ID=pro
# 개발·스크린샷용 (출시 빌드에서 끄기)
VITE_PRO_PREVIEW=true
```

---

## Notion 연동 (1차)

사용자가 Notion **Internal Integration**을 만들고:

1. Token을 Settings → Quote Pro → Notion에 저장 (기기 로컬 Preferences).
2. 내보낼 **부모 페이지 ID** 입력 (페이지 Share → Integration 초대 필요).
3. Export 시 Notion API로 하위 페이지 생성 (책별 heading + quote 블록).

토큰은 서버에 올리지 않음. CORS: **네이티브**에서 `CapacitorHttp` 사용. 웹은 제한될 수 있음 → Markdown 복사를 폴백.

---

## Obsidian (1차)

- 짧은 내보내기: `obsidian://new?name=...&content=...`
- URI 길이 초과: `.md` 파일 공유 → vault 폴더에 저장하도록 안내

---

## 코드 맵

| 영역 | 경로 |
| --- | --- |
| Config | `src/config/pro.ts` |
| Entitlement / purchase | `src/features/iap/purchases.ts`, `ProProvider.tsx` |
| Markdown / Obsidian / Notion | `src/features/export/*` |
| Settings UI | `Settings.tsx` + `ProSheet` + `ArchiveExportSheet` |
| Watermark gate | `renderQuoteCard.ts` ← `ShareQuoteSheet` |

---

## 출시 순서 제안

1. 코드 머지 + `VITE_PRO_PREVIEW`로 UX QA  
2. ASC/Play 구독 상품 + RC entitlement  
3. Preview 끄고 TestFlight / Play 내부테스트  
4. 스토어 메타에 Pro 기능 문구 추가
