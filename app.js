/**********************************************
 *  GLOBAL STATE
 **********************************************/
let originalText = "";
let matches = [];
let currentPopup = null;
let lang = "ko";   // 기본 언어

/**********************************************
 *  HTML ESCAPE
 **********************************************/
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**********************************************
 *  SMART REPLACE (띄어쓰기 보정 포함)
 **********************************************/
function smartReplace(text, offset, length, replacement) {
  const before = text[offset - 1];
  const after = text[offset + length];

  let final = replacement;

  if (before && before !== " " && /^[A-Za-z0-9가-힣]/.test(replacement[0])) {
    final = " " + final;
  }
  if (after && after !== " " && /^[A-Za-z0-9가-힣]/.test(replacement[replacement.length - 1])) {
    final = final + " ";
  }

  return text.slice(0, offset) + final + text.slice(offset + length);
}

/**********************************************
 *  UPDATE OFFSETS AFTER EACH REPLACE
 **********************************************/
function offsetUpdate(matches, changed, oldLen, newLen) {
  const diff = newLen - oldLen;
  return matches.map(m => {
    if (m.offset > changed.offset) {
      return { ...m, offset: m.offset + diff };
    }
    return m;
  });
}

/**********************************************
 *  RENDER TEXT + ERROR MARKUP
 **********************************************/
function render() {
  let out = "";
  let last = 0;

  const active = matches
    .filter(m => !m.ignored)
    .sort((a, b) => a.offset - b.offset);

  active.forEach(m => {
    out += escapeHTML(originalText.slice(last, m.offset));

    out += `
      <span class="error-part" data-id="${matches.indexOf(m)}">
        <span class="wrong">${escapeHTML(originalText.substr(m.offset, m.length))}</span>
        <span class="suggest">${escapeHTML(m.value)}</span>
      </span>
    `;

    last = m.offset + m.length;
  });

  out += escapeHTML(originalText.slice(last));

  document.getElementById("text-preview").innerHTML = out;
  document.getElementById("textarea").value = originalText;

  bindErrorClick();
}

/**********************************************
 *  BIND CLICK EVENTS
 **********************************************/
function bindErrorClick() {
  document.querySelectorAll(".error-part").forEach(el => {
    el.onclick = () => {
      const id = Number(el.dataset.id);
      openPopup(matches[id]);
    };
  });
}

/**********************************************
 *  POPUP
 **********************************************/
function openPopup(m) {
  currentPopup = m;

  document.getElementById("popup-wrong").textContent =
    originalText.substr(m.offset, m.length);
  document.getElementById("popup-correct").textContent = m.value;

  updateFeedbackLanguage();

  document.getElementById("popup").style.display = "flex";
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}

/**********************************************
 *  LANGUAGE SWITCH
 **********************************************/
function updateFeedbackLanguage() {
  if (!currentPopup) return;

  const txt = (lang === "ko") ? currentPopup.feedback_ko : currentPopup.feedback;
  document.getElementById("popup-feedback").textContent = txt;
}

document.getElementById("lang-switch").onclick = () => {
  lang = (lang === "ko" ? "en" : "ko");
  updateFeedbackLanguage();
};

/**********************************************
 *  APPLY SINGLE CHANGE
 **********************************************/
document.getElementById("btn-accept").onclick = () => {
  const m = currentPopup;
  const oldLen = m.length;
  const newLen = m.value.length;

  originalText = smartReplace(originalText, m.offset, m.length, m.value);

  matches = offsetUpdate(matches, m, oldLen, newLen);
  m.ignored = true;

  closePopup();
  render();
};

/**********************************************
 *  IGNORE SINGLE
 **********************************************/
document.getElementById("btn-ignore").onclick = () => {
  currentPopup.ignored = true;
  closePopup();
  render();
};

/**********************************************
 *  APPLY ALL (뒤에서부터)
 **********************************************/
document.getElementById("apply-all").onclick = () => {
  const list = matches
    .filter(m => !m.ignored)
    .sort((a, b) => b.offset - a.offset);

  list.forEach(m => {
    originalText = smartReplace(originalText, m.offset, m.length, m.value);
  });

  matches.forEach(m => (m.ignored = true));
  render();
};

/**********************************************
 *  IGNORE ALL
 **********************************************/
document.getElementById("ignore-all").onclick = () => {
  matches.forEach(m => (m.ignored = true));
  render();
};

/**********************************************
 *  LOADING BAR
 **********************************************/
let loadingTimer = null;

function showLoading() {
  const bar = document.getElementById("loading-bar");
  bar.style.width = "0%";
  bar.style.opacity = 1;

  const predicted = getRandom(45, 60) * 1000;
  const start = Date.now();

  loadingTimer = setInterval(() => {
    const now = Date.now();
    const rate = Math.min((now - start) / predicted, 0.97);
    bar.style.width = (rate * 100) + "%";
  }, 100);
}

function hideLoading() {
  clearInterval(loadingTimer);
  const bar = document.getElementById("loading-bar");
  bar.style.width = "100%";
  setTimeout(() => (bar.style.opacity = 0), 500);
}

function getRandom(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

/**********************************************
 *  PROOFREAD REQUEST
 **********************************************/
document.getElementById("start").onclick = doProofread;

async function doProofread() {
  const text = document.getElementById("textarea").value;
  originalText = text;

  showLoading();

  const res = await fetch("/api/proofreading", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  const data = await res.json();

  originalText = data.payload.rtn.text;

  matches = data.payload.rtn.matches.map(m => ({
    ...m,
    ignored: false
  }));

  hideLoading();
  render();
}
