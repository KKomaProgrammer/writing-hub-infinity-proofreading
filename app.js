let originalText = "";
let matches = [];
let lang = "en";
let currentMatchID = null;

const textInput = document.getElementById("textInput");
const viewer = document.getElementById("viewer");


// --------------------------------------------------
// 글로벌 언어 전환
// --------------------------------------------------
document.getElementById("globalLang").onclick = () => {
  lang = lang === "en" ? "ko" : "en";
  document.getElementById("globalLang").textContent = lang.toUpperCase();

  // 팝업이 열려 있으면 즉시 업데이트
  const popup = document.getElementById("popup");
  if (!popup.classList.contains("hidden") && currentMatchID !== null) {
    const m = matches[currentMatchID];
    document.getElementById("popup-body").textContent =
      lang === "en" ? m.data.feedback : m.data.feedback_ko;
  }
};


// --------------------------------------------------
// Smart Replace (단어 붙음 방지 / 자연스러운 교정)
// --------------------------------------------------
function smartReplace(text, offset, length, replacement) {
  const beforeChar = text[offset - 1] || "";
  const afterChar = text[offset + length] || "";

  let final = replacement;

  // 앞뒤 공백 자동 보정
  if (beforeChar && beforeChar !== " " && /^[A-Za-z가-힣]/.test(replacement[0])) {
    final = " " + final;
  }
  if (afterChar && afterChar !== " " && /[A-Za-z가-힣]$/.test(replacement[replacement.length - 1])) {
    final = final + " ";
  }

  return (
    text.slice(0, offset) +
    final +
    text.slice(offset + length)
  );
}



// --------------------------------------------------
// Proofreading 요청
// --------------------------------------------------
document.getElementById("runBtn").onclick = async () => {
  const userText = textInput.value.trim();
  if (!userText) return alert("본문을 입력해주세요!");

  startLoadingBar();

  const res = await fetch("/api/proofreading", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: userText })
  });

  finishLoadingBar();

  const data = await res.json();

  originalText = data.payload.rtn.text;
  matches = data.payload.rtn.matches.map((m, i) => ({
    ...m,
    id: i,
    ignored: false
  }));

  document.getElementById("toolbar").classList.remove("hidden");
  render();
};


// --------------------------------------------------
// 화면 렌더링
// --------------------------------------------------
function render() {
  viewer.innerHTML = "";

  const active = matches.filter(m => !m.ignored);

  let cursor = 0;
  const tokens = [];

  active.forEach(m => {
    const before = originalText.slice(cursor, m.offset);
    if (before) tokens.push({ type: "text", text: before });

    const wrong = originalText.slice(m.offset, m.offset + m.length);

    tokens.push({
      type: "match",
      id: m.id,
      wrong,
      correct: m.value,
      data: m
    });

    cursor = m.offset + m.length;
  });

  if (cursor < originalText.length)
    tokens.push({ type: "text", text: originalText.slice(cursor) });

  tokens.forEach(t => {
    if (t.type === "text") {
      viewer.append(t.text);
    } else {
      const w = document.createElement("span");
      w.className = "wrong";
      w.textContent = t.wrong;
      w.onclick = e => openPopup(t, e.pageX, e.pageY);
      viewer.append(w);

      const c = document.createElement("span");
      c.className = "correct";
      c.textContent = t.correct;
      c.onclick = e => openPopup(t, e.pageX, e.pageY);
      viewer.append(c);
    }
  });

  // textarea와 동기화
  textInput.value = originalText;
}



// --------------------------------------------------
// 팝업 열기
// --------------------------------------------------
function openPopup(match, x, y) {
  currentMatchID = match.id;

  document.getElementById("popup-original").textContent = match.wrong;
  document.getElementById("popup-suggest").textContent = match.correct;
  document.getElementById("popup-body").textContent =
    lang === "en" ? match.data.feedback : match.data.feedback_ko;

  const popup = document.getElementById("popup");
  popup.style.left = x + "px";
  popup.style.top = y + "px";
  popup.classList.remove("hidden");
}



// --------------------------------------------------
// 팝업 EN/KO 전환
// --------------------------------------------------
document.getElementById("langToggle").onclick = () => {
  lang = lang === "en" ? "ko" : "en";
  document.getElementById("langToggle").textContent = lang.toUpperCase();

  const m = matches[currentMatchID];
  document.getElementById("popup-body").textContent =
    lang === "en" ? m.data.feedback : m.data.feedback_ko;
};



// --------------------------------------------------
// 개별 적용 (Apply)
// --------------------------------------------------
document.getElementById("btn-accept").onclick = () => {
  const m = matches[currentMatchID];

  originalText = smartReplace(originalText, m.offset, m.length, m.value);

  m.ignored = true;

  closePopup();
  render();
};



// --------------------------------------------------
// 개별 무시 (Ignore)
// --------------------------------------------------
document.getElementById("btn-ignore").onclick = () => {
  matches[currentMatchID].ignored = true;
  closePopup();
  render();
};



// --------------------------------------------------
// 전체 적용
// --------------------------------------------------
document.getElementById("applyAllBtn").onclick = () => {
  const active = matches.filter(m => !m.ignored);
  active.sort((a, b) => b.offset - a.offset);

  active.forEach(m => {
    originalText = smartReplace(
      originalText,
      m.offset,
      m.length,
      m.value
    );
    m.ignored = true;
  });

  matches = matches.map(m => ({ ...m, ignored: true }));

  closePopup();
  render();
};



// --------------------------------------------------
// 전체 무시
// --------------------------------------------------
document.getElementById("ignoreAllBtn").onclick = () => {
  matches.forEach(m => (m.ignored = true));
  closePopup();
  render();
};



// --------------------------------------------------
// 팝업 닫기
// --------------------------------------------------
function closePopup() {
  document.getElementById("popup").classList.add("hidden");
}



// --------------------------------------------------
// 로딩바 개선(요청 즉시 0→70, 응답 시 빠르게 70→100)
// --------------------------------------------------
let loadingInterval = null;
let loadingProgress = 0;
let startTime = 0;

function startLoadingBar() {
  startTime = Date.now();
  loadingProgress = 0;

  const bar = document.getElementById("loadingBar");
  const fill = document.getElementById("loadingFill");

  bar.classList.remove("hidden");
  fill.style.width = "0%";
  fill.style.transition = "none";

  const target = 70;
  const duration = 1100; // 1.1초

  const start = Date.now();
  loadingInterval = setInterval(() => {
    const elapsed = Date.now() - start;
    const ratio = Math.min(elapsed / duration, 1);

    loadingProgress = target * ratio;
    fill.style.width = loadingProgress + "%";

    if (ratio >= 1) {
      clearInterval(loadingInterval);
      loadingInterval = null;
    }
  }, 16);
}

function finishLoadingBar() {
  const bar = document.getElementById("loadingBar");
  const fill = document.getElementById("loadingFill");

  clearInterval(loadingInterval);

  const actual = Date.now() - startTime;
  const divisor = Math.floor(Math.random() * (75 - 65 + 1)) + 65;

  const predicted = actual / divisor;
  const duration = Math.max(predicted, 0.12); // 최소 0.12초

  fill.style.transition = `width ${duration}s linear`;
  fill.style.width = "100%";

  setTimeout(() => {
    bar.classList.add("hidden");
    fill.style.transition = "none";
    fill.style.width = "0%";
  }, duration * 1000 + 120);
}
