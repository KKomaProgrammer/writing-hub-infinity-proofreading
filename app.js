let originalText = "";
let matches = [];
let lang = "en";

const textInput = document.getElementById("textInput");
const viewer = document.getElementById("viewer");

// --------------------------------
// ACTUAL PROOFREAD BUTTON
// --------------------------------
document.getElementById("runBtn").onclick = async () => {
  const userText = textInput.value.trim();
  if (!userText) return alert("본문을 입력해주세요!");

  const res = await fetch("/api/proofreading", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: userText })
  });

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

// --------------------------------
// OFFSET REINDEXING AFTER APPLY
// --------------------------------
function reindexMatches(oldOffset, oldLength, newLength) {
  const diff = newLength - oldLength;

  matches = matches.map(m => {
    if (m.offset > oldOffset) {
      return { ...m, offset: m.offset + diff };
    }
    return m;
  });
}

// --------------------------------
// MAIN TOKENIZER
// --------------------------------
function buildTokens(text, matches) {
  let result = [];
  let cursor = 0;

  matches.forEach(m => {
    if (m.ignored) return;

    const before = text.slice(cursor, m.offset);
    if (before) result.push({ type: "text", text: before });

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

// --------------------------------
// RENDER
// --------------------------------
function render() {
  viewer.innerHTML = "";

  const tokens = buildTokens(originalText, matches);

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

  // textarea에도 반영
  textInput.value = originalText;
}

// --------------------------------
// POPUP
// --------------------------------
function openPopup(match, x, y) {
  window.currentMatchID = match.id;

  document.getElementById("popup-original").textContent = match.wrong;
  document.getElementById("popup-suggest").textContent = match.correct;

  document.getElementById("popup-body").textContent =
    lang === "en" ? match.data.feedback : match.data.feedback_ko;

  const p = document.getElementById("popup");
  p.style.left = x + "px";
  p.style.top = y + "px";
  p.classList.remove("hidden");
}

// EN/KO 즉시 반영
document.getElementById("langToggle").onclick = () => {
  lang = lang === "en" ? "ko" : "en";
  const m = matches[window.currentMatchID];

  document.getElementById("popup-body").textContent =
    lang === "en" ? m.data.feedback : m.data.feedback_ko;

  document.getElementById("langToggle").textContent = lang.toUpperCase();
};

// --------------------------------
// ACCEPT
// --------------------------------
document.getElementById("btn-accept").onclick = () => {
  const m = matches[currentMatchID];

  originalText =
    originalText.slice(0, m.offset) +
    m.value +
    originalText.slice(m.offset + m.length);

  m.ignored = true;

  // 다시 정렬해서 안전하게 재배치
  matches = matches
    .filter(x => !x.ignored)
    .concat(matches.filter(x => x.ignored));

  textInput.value = originalText;
  closePopup();
  render();
};

// --------------------------------
// IGNORE
// --------------------------------
document.getElementById("btn-ignore").onclick = () => {
  matches[window.currentMatchID].ignored = true;
  closePopup();
  render();
};

// --------------------------------
// APPLY ALL
// --------------------------------
document.getElementById("applyAllBtn").onclick = () => {
  // 뒤에서부터 정렬
  const sorted = matches
    .filter(m => !m.ignored)
    .sort((a, b) => b.offset - a.offset);

  sorted.forEach(m => {
    originalText =
      originalText.slice(0, m.offset) +
      m.value +
      originalText.slice(m.offset + m.length);

    m.ignored = true;
  });

  textInput.value = originalText;
  render();
  closePopup();
};
// document.getElementById("applyAllBtn").onclick = () => {
//   matches.forEach(m => {
//     if (m.ignored) return;

//     const before = originalText.slice(0, m.offset);
//     const after = originalText.slice(m.offset + m.length);
//     originalText = before + m.value + after;

//     const oldLen = m.length;
//     const newLen = m.value.length;
//     reindexMatches(m.offset, oldLen, newLen);

//     m.ignored = true;
//   });

//   closePopup();
//   render();
// };

// --------------------------------
// IGNORE ALL
// --------------------------------
document.getElementById("ignoreAllBtn").onclick = () => {
  matches.forEach(m => (m.ignored = true));
  closePopup();
  render();
};

// Close popup
function closePopup() {
  document.getElementById("popup").classList.add("hidden");
}
