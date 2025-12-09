let originalText = "";
let matches = [];
let lang = "en";

document.getElementById("runBtn").onclick = async () => {
  const text = document.getElementById("textInput").value.trim();
  if (!text) return alert("본문을 입력하세요.");

  const res = await fetch("/api/proofreading", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  const data = await res.json();
  const rtn = data.payload.rtn;

  originalText = rtn.text;

  // ★ matches는 항상 offset 기준 오름차순 정렬
  matches = rtn.matches
    .map((m, i) => ({ ...m, id: i, ignored: false }))
    .sort((a, b) => a.offset - b.offset);

  document.getElementById("toolbar").classList.remove("hidden");
  render();
};


// -------------------------
// 텍스트 → 토큰 빌드
// -------------------------
function buildTokens(text, matches) {
  const result = [];
  let cursor = 0;

  matches.forEach(m => {
    if (m.ignored) return;

    const before = text.slice(cursor, m.offset);
    if (before.length) result.push({ type: "text", text: before });

    const wrong = text.slice(m.offset, m.offset + m.length);

    result.push({
      type: "match",
      id: m.id,
      wrong,
      correct: m.value,
      data: m
    });

    cursor = m.offset + m.length;
  });

  if (cursor < text.length)
    result.push({ type: "text", text: text.slice(cursor) });

  return result;
}


// -------------------------
// 렌더링
// -------------------------
function render() {
  const tokens = buildTokens(originalText, matches);
  const viewer = document.getElementById("viewer");

  viewer.innerHTML = "";

  tokens.forEach(t => {
    if (t.type === "text") {
      viewer.append(t.text);
    } else {
      const w = document.createElement("span");
      w.className = "wrong";
      w.textContent = t.wrong;
      w.onclick = e => openPopup(t, e.pageX, e.pageY);
      viewer.append(w);

      if (t.correct) {
        const c = document.createElement("span");
        c.className = "correct";
        c.textContent = t.correct;
        c.onclick = e => openPopup(t, e.pageX, e.pageY);
        viewer.append(c);
      }
    }
  });
}


// -------------------------
// 팝업
// -------------------------
function openPopup(m, x, y) {
  window.currentID = m.id;

  // ★ 줄바꿈 방지 (UI 깨짐 해결)
  document.getElementById("popup-original").innerHTML = freeze(m.wrong);
  document.getElementById("popup-suggest").innerHTML = freeze(m.correct);

  document.getElementById("popup-body").textContent =
    lang === "en" ? m.data.feedback : m.data.feedback_ko;

  const p = document.getElementById("popup");
  p.style.left = x + "px";
  p.style.top = y + "px";
  p.classList.remove("hidden");
}

// 공백 고정 → 줄바꿈 절대 안 됨
function freeze(str) {
  return str.replace(/ /g, "&nbsp;");
}


// // -------------------------
// // 언어 전환
// // -------------------------
// document.getElementById("langToggle").onclick = () => {
//   lang = lang === "en" ? "ko" : "en";
//   const m = matches[window.currentID];
//   document.getElementById("popup-body").textContent =
//     lang === "en" ? m.data.feedback : m.data.feedback_ko;
// };


// -------------------------
// 단일 적용
// -------------------------
document.getElementById("btn-accept").onclick = () => {
  const m = matches[window.currentID];

  // 문자열 교체
  const before = originalText.slice(0, m.offset);
  const after = originalText.slice(m.offset + m.length);
  originalText = before + m.value + after;

  // ★ offset 보정 (정확한 위치 유지)
  const diff = m.value.length - m.length;
  matches.forEach(x => {
    if (x.offset > m.offset) x.offset += diff;
  });

  m.ignored = true;
  closePopup();
  render();
};

document.getElementById("applyAllBtn").onclick = () => {
  applyAll()
  closePopup();
  render();
};


// -------------------------
// 단일 거부
// -------------------------
document.getElementById("ignoreAllBtn").onclick = () => {
  matches[window.currentID].ignored = true;
  closePopup();
  render();
};


// -------------------------
// 전체 적용 (정확한 방식)
// -------------------------
function applyAll() {
  // ★ offset 문제 해결 위해 역순 처리
  const list = matches.filter(m => !m.ignored).sort((a, b) => b.offset - a.offset);

  list.forEach(m => {
    const before = originalText.slice(0, m.offset);
    const after = originalText.slice(m.offset + m.length);
    originalText = before + m.value + after;
  });

  // 모든 적용된 match ignored 처리
  matches.forEach(m => {
    if (!m.ignored) m.ignored = true;
  });

  closePopup();
  render();
}


// -------------------------
// 전체 거부
// -------------------------
function ignoreAll() {
  matches.forEach(m => (m.ignored = true));
  closePopup();
  render();
}


// -------------------------
function closePopup() {
  document.getElementById("popup").classList.add("hidden");
}
let UIlang = "en";

// ===============================
// 언어 토글
// ===============================
const langSwitch = document.getElementById("langSwitch");
langSwitch.onclick = () => {
  const newLang = UIlang === "en" ? "ko" : "en";
  setLanguage(newLang);
};

// ===============================
// UI 전체 언어 변경 함수
// ===============================
function setLanguage(l) {
  UIlang = l;

  // 토글 스위치 외관 전환
  if (UIlang === "en") langSwitch.classList.remove("on");
  else langSwitch.classList.add("on");

  // HTML의 모든 data-eng / data-kor를 찾아 변환
  document.querySelectorAll("[data-eng]").forEach(el => {
    const text = UIlang === "en" ? el.dataset.eng : el.dataset.kor;
    if (text !== undefined) el.textContent = text;
  });

  // popup 내용도 즉시 반영
  if (window.currentID !== undefined) {
    const m = matches[window.currentID];
    document.getElementById("popup-body").textContent =
      UIlang === "en" ? m.data.feedback : m.data.feedback_ko;
  }
}

// 초기 언어 설정
setLanguage("en");
