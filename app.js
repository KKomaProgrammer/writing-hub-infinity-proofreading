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

  // 팝업이 열려 있으면 즉시 업데이트
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

  endLoadingBar();

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

  // Apply
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
// LOADING BAR
// --------------------------------------------------
function startLoadingBar() {
  const bar = document.getElementById("loadingBar");
  const fill = document.getElementById("loadingFill");

  bar.classList.remove("hidden");
  fill.style.width = "0%";

  setTimeout(() => (fill.style.width = "40%"), 100);
  setTimeout(() => (fill.style.width = "70%"), 400);
  setTimeout(() => (fill.style.width = "100%"), 1000);
}

function endLoadingBar() {
  const bar = document.getElementById("loadingBar");
  const fill = document.getElementById("loadingFill");

  setTimeout(() => {
    bar.classList.add("hidden");
    fill.style.width = "0%";
  }, 300);
}
