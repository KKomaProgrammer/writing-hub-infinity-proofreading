/* =============================
      전역 상태값
============================= */
let originalText = "";     // 사용자 입력 원문
let currentHTML = "";      // 화면에 표시할 HTML
let matches = [];          // AI 수정 목록
let currentPopupMatch = null;
let lang = "ko";           // 기본 언어: 한국어

/* =============================
      공백 보정 치환 함수
============================= */
function smartReplace(text, offset, length, replacement) {
  const beforeChar = text[offset - 1] || "";
  const afterChar = text[offset + length] || "";

  let final = replacement;

  // 앞 공백 자동 보정
  if (beforeChar && beforeChar !== " " && /^[a-zA-Z가-힣0-9]/.test(replacement[0])) {
    final = " " + final;
  }
  // 뒤 공백 자동 보정
  if (afterChar && afterChar !== " " && /^[a-zA-Z가-힣0-9]$/.test(replacement[replacement.length - 1])) {
    final = final + " ";
  }

  return (
    text.slice(0, offset) +
    final +
    text.slice(offset + length)
  );
}

/* =============================
   offset 보정 (개별 적용 시)
============================= */
function updateOffsetsAfterReplace(matches, changedMatch, oldLen, newLen) {
  const diff = newLen - oldLen;

  return matches.map(m => {
    if (m.offset > changedMatch.offset) {
      return { ...m, offset: m.offset + diff };
    }
    return m;
  });
}

/* =============================
    HTML 렌더링
============================= */
function render() {
  let html = "";
  let lastIndex = 0;

  const active = matches
    .filter(m => !m.ignored)
    .sort((a, b) => a.offset - b.offset);

  active.forEach(m => {
    html += escapeHTML(originalText.slice(lastIndex, m.offset));

    html += `
      <span class="error-part" data-id="${matches.indexOf(m)}">
        <span class="wrong">${escapeHTML(originalText.substr(m.offset, m.length))}</span>
        <span class="suggest">${escapeHTML(m.value)}</span>
      </span>
    `;

    lastIndex = m.offset + m.length;
  });

  html += escapeHTML(originalText.slice(lastIndex));

  document.getElementById("text-preview").innerHTML = html;
  document.getElementById("textarea").value = originalText;

  bindClickEvents();
}

function escapeHTML(t) {
  return t.replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
}

/* =============================
      개별 수정 클릭 바인딩
============================= */
function bindClickEvents() {
  document.querySelectorAll(".error-part").forEach(el => {
    el.onclick = () => {
      const id = Number(el.dataset.id);
      openPopup(matches[id]);
    };
  });
}

/* =============================
      팝업 열기 / 닫기
============================= */
function openPopup(m) {
  currentPopupMatch = m;

  document.getElementById("popup-wrong").textContent =
    originalText.substr(m.offset, m.length);

  document.getElementById("popup-correct").textContent = m.value;

  updatePopupLanguage();

  document.getElementById("popup").style.display = "flex";
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}

/* =============================
      언어 전환
============================= */
function updatePopupLanguage() {
  if (!currentPopupMatch) return;

  const text = (lang === "ko")
    ? currentPopupMatch.feedback_ko
    : currentPopupMatch.feedback;

  document.getElementById("popup-feedback").textContent = text;
}

document.getElementById("lang-switch").onclick = () => {
  lang = (lang === "ko" ? "en" : "ko");
  updatePopupLanguage();
};

/* =============================
      개별 적용
============================= */
document.getElementById("btn-accept").onclick = () => {
  const m = currentPopupMatch;

  const oldLen = m.length;
  const newLen = m.value.length;

  originalText = smartReplace(originalText, m.offset, m.length, m.value);

  matches = updateOffsetsAfterReplace(matches, m, oldLen, newLen);
  m.ignored = true;

  closePopup();
  render();
};

/* =============================
      개별 거부
============================= */
document.getElementById("btn-ignore").onclick = () => {
  currentPopupMatch.ignored = true;
  closePopup();
  render();
};

/* =============================
        전체 적용
============================= */
document.getElementById("apply-all").onclick = () => {
  const active = matches
    .filter(m => !m.ignored)
    .sort((a, b) => b.offset - a.offset);

  active.forEach(m => {
    originalText = smartReplace(originalText, m.offset, m.length, m.value);
  });

  matches.forEach(m => (m.ignored = true));

  render();
};

/* =============================
        전체 거부
============================= */
document.getElementById("ignore-all").onclick = () => {
  matches.forEach(m => (m.ignored = true));
  render();
};

/* =============================
      Proofreading 요청
============================= */
async function doProofread() {
  const inputText = document.getElementById("textarea").value;
  originalText = inputText;

  showLoadingBar();

  const res = await fetch("/api/proofreading", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: inputText })
  });

  const data = await res.json();

  // Writing Hub API 구조 그대로 반영
  originalText = data.payload.rtn.text;

  matches = data.payload.rtn.matches.map(m => ({
    ...m,
    ignored: false
  }));

  hideLoadingBar();
  render();
}

document.getElementById("start").onclick = doProofread;

/* =============================
      로딩바 (예측 시간)
============================= */
let loadingInterval = null;

function showLoadingBar() {
  const bar = document.getElementById("loading-bar");
  bar.style.width = "0%";
  bar.style.opacity = 1;

  const predicted = getRandomInt(55, 80) * 1000; // 55~80초 예측

  const start = Date.now();

  loadingInterval = setInterval(() => {
    const now = Date.now();
    const ratio = Math.min((now - start) / predicted, 0.98);

    bar.style.width = (ratio * 100) + "%";
  }, 100);
}

function hideLoadingBar() {
  clearInterval(loadingInterval);
  const bar = document.getElementById("loading-bar");
  bar.style.width = "100%";
  setTimeout(() => (bar.style.opacity = 0), 500);
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
