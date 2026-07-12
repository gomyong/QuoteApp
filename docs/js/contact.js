/**
 * Landing contact form → Supabase contact_inquiries (anon insert).
 * Requires window.QUOTE_SUPABASE from supabase-config.js and supabase-js UMD.
 */
(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const statusEl = document.getElementById("form-status");
  const submitBtn = document.getElementById("contact-submit");
  const cfg = window.QUOTE_SUPABASE;

  const setStatus = (text, tone) => {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.dataset.tone = tone || "";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");

    if (!cfg?.url || !cfg?.anonKey) {
      setStatus("문의 설정이 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요.", "error");
      return;
    }
    if (typeof window.supabase?.createClient !== "function") {
      setStatus("일시적인 오류예요. 페이지를 새로고침한 뒤 다시 시도해 주세요.", "error");
      return;
    }

    const fd = new FormData(form);
    // Honeypot — bots fill this; humans never see it.
    if (String(fd.get("company") || "").trim()) {
      setStatus("문의를 보내 주셔서 감사합니다.", "ok");
      form.reset();
      return;
    }

    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const message = String(fd.get("message") || "").trim();

    if (!name || !email || !message) {
      setStatus("성함, 이메일, 문의 내용을 모두 입력해 주세요.", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("이메일 주소를 확인해 주세요.", "error");
      return;
    }

    submitBtn.disabled = true;
    setStatus("보내는 중…");

    try {
      const client = window.supabase.createClient(cfg.url, cfg.anonKey);
      const { error } = await client.from("contact_inquiries").insert({
        name,
        email,
        message,
        user_agent: navigator.userAgent?.slice(0, 400) || null,
      });

      if (error) {
        console.warn("[contact]", error);
        setStatus("전송에 실패했어요. 잠시 후 다시 시도해 주세요.", "error");
        return;
      }

      form.reset();
      setStatus("문의를 보내 주셔서 감사합니다. 확인 후 답변드릴게요.", "ok");
    } catch (err) {
      console.warn("[contact]", err);
      setStatus("네트워크 오류가 났어요. 연결을 확인해 주세요.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
})();

(function () {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  links.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
})();
