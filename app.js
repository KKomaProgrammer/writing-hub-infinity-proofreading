let originalText = "";
let matches = [];
let lang = "en";
let currentMatchID = null;

const textInput = document.getElementById("textInput");
const viewer = document.getElementById("viewer");


// --------------------------------------------------
// GLOBAL LANGUAGE TOGGLE
// --------------------------------------------------
document.getElementById("globalLang").onclick = () => {
  lang = lang === "en" ? "ko" : "en";
  document.getElementById("globalLang").textContent = lang.toUpperCase();

  // 팝업 열려있을 경우 즉시 반영
  const popup = document.getElementById("popup");
  if (!popup.classList.contains("hidden") && currentMatchID !== null) {
    const m = matches[currentMatchID];
    document.getElementById("popup-body").textContent =
      lang === "en" ? m.data.feedback : m.data.feedback_ko;
  }
};


// --------------------------------------------------
// PROOFREAD BUTTON
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
// RENDER FUNCTION
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

  if (cursor < originalText.length) {
    tokens.push({ type: "text", text: originalText.slice(cursor) });
  }

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

  textInput.value = originalText;
}


// --------------------------------------------------
// POPUP OPEN
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
// POPUP LANGUAGE TOGGLE
// --------------------------------------------------
document.getElementById("langToggle").onclick = () => {
  lang = lang === "en" ? "ko" : "en";
  document.getElementById("langToggle").textContent = lang.toUpperCase();

  const m = matches[currentMatchID];
  document.getElementById("popup-body").textContent =
    lang === "en" ? m.data.feedback : m.data.feedback_ko;
};


// --------------------------------------------------
// ACCEPT (개별 적용)
// --------------------------------------------------
document.getElementById("btn-accept").onclick = () => {
  const m = matches[currentMatchID];

  originalText =
    originalText.slice(0, m.offset) +
    m.value +
    originalText.slice(m.offset + m.length);

  m.ignored = true;

  closePopup();
  render();
};


// --------------------------------------------------
// IGNORE (개별 거부)
// --------------------------------------------------
document.getElementById("btn-ignore").onclick = () => {
  matches[currentMatchID].ignored = true;
  closePopup();
  render();
};


// --------------------------------------------------
// APPLY ALL (전체 적용)
// --------------------------------------------------
document.getElementById("applyAllBtn").onclick = () => {
  const active = matches.filter(m => !m.ignored);
  active.sort((a, b) => b.offset - a.offset);

  active.forEach(m => {
    originalText =
      originalText.slice(0, m.offset) +
      m.value +
      originalText.slice(m.offset + m.length);

    m.ignored = true;
  });

  // 전체 matches 클린업
  matches = matches.map(m => ({ ...m, ignored: true }));

  closePopup();
  render();
};


// --------------------------------------------------
// IGNORE ALL (전체 거부)
// --------------------------------------------------
document.getElementById("ignoreAllBtn").onclick = () => {
  matches.forEach(m => (m.ignored = true));
  closePopup();
  render();
};


// --------------------------------------------------
// CLOSE POPUP
// --------------------------------------------------
function closePopup() {
  document.getElementById("popup").classList.add("hidden");
}


// --------------------------------------------------
// ADVANCED LOADING BAR
// 걸린 시간 / (55~80 무작위) 기반 예측형 로딩바
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

  // 0% → 70%까지 자연 증가 (1.1초)
  const target = 70;
  const duration = 1100; // 1.1초 (이전보다 살짝 감소한 값)

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

  // 응답이 왔으면 70% → 100% 빠르게 채움
  clearInterval(loadingInterval);

  // 예측시간 살짝 감소:
  // 실제걸린시간 / (65~75) → 이전보다 확실히 짧아짐
  const divisor = Math.floor(Math.random() * (75 - 65 + 1)) + 65;

  const actual = Date.now() - startTime;
  const predicted = actual / divisor; // 더 짧게!
  const duration = Math.max(predicted, 0.12); // 최소 0.12초

  fill.style.transition = `width ${duration}s linear`;
  fill.style.width = "100%";

  setTimeout(() => {
    bar.classList.add("hidden");
    fill.style.transition = "none";
    fill.style.width = "0%";
  }, duration * 1000 + 120);
}
