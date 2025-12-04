// ================== 유틸 함수 ==================
function freezeSpaces(str) {
    // 띄어쓰기 → non-breaking space 치환 (줄바꿈 100% 방지)
    return str.replace(/ /g, "&nbsp;");
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// ================== DOM 요소 ==================
const textarea = document.getElementById("textarea");
const preview = document.getElementById("text-preview");

const btnStart = document.getElementById("start");
const btnApplyAll = document.getElementById("apply-all");
const btnIgnoreAll = document.getElementById("ignore-all");
const btnLang = document.getElementById("lang-switch");

// popup
const popup = document.getElementById("popup");
const popupWrong = document.getElementById("popup-wrong");
const popupCorrect = document.getElementById("popup-correct");
const popupFeedback = document.getElementById("popup-feedback");
const popupAccept = document.getElementById("btn-accept");
const popupIgnore = document.getElementById("btn-ignore");

// loading bar
const loadingContainer = document.getElementById("loading-container");
const loadingBar = document.getElementById("loading-bar");

// ================== 글로벌 상태 ==================
let proofData = null;
let currentLang = "ko";
let currentIndex = 0;

// ================== 로딩바 애니메이션 ==================
function startLoadingBar() {
    loadingBar.style.width = "0%";

    // 걸린 시간 예측: 55~80 중 랜덤
    const total = Math.floor(Math.random() * 26) + 55; // 55~80

    let elapsed = 0;
    const interval = setInterval(() => {
        elapsed++;
        const pct = Math.min((elapsed / total) * 100, 100);
        loadingBar.style.width = pct + "%";

        if (pct >= 100) clearInterval(interval);
    }, 120);
}

// ================== 서버에 교정 요청 ==================
async function doProofread() {
    const text = textarea.value.trim();
    if (!text) return alert("텍스트를 입력하세요.");

    preview.innerHTML = "";
    loadingBar.style.opacity = "1";
    startLoadingBar();

    const payload = {
        header: {
            call_message_id: "296b169c20554de4ba9e0fe760be40da"
        },
        payload: {
            text,
            raise_error: false
        }
    };

    const res = await fetch("/api/proofread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const json = await res.json();
    proofData = json.payload?.rtn;

    if (!proofData || !proofData.matches) {
        preview.innerHTML = escapeHtml(text);
        return;
    }

    renderTextWithErrors();
}

// ================== 교정된 텍스트 렌더링 ==================
function renderTextWithErrors() {
    let text = proofData.text;
    let html = "";
    let pos = 0;

    proofData.matches.forEach((m, index) => {
        const start = m.offset;
        const end = m.offset + m.length;
        const wrong = text.substring(start, end);

        html += escapeHtml(text.substring(pos, start));

        html += `
        <span class="error-part" data-index="${index}">
            <span class="wrong">${freezeSpaces(escapeHtml(wrong))}</span>
            ${
                m.value
                    ? `<span class="suggest">${freezeSpaces(escapeHtml(m.value))}</span>`
                    : ""
            }
        </span>`;

        pos = end;
    });

    html += escapeHtml(text.substring(pos));
    preview.innerHTML = html;

    document.querySelectorAll(".error-part").forEach(el => {
        el.onclick = () => openPopup(parseInt(el.dataset.index));
    });
}

// ================== 팝업 열기 ==================
function openPopup(index) {
    currentIndex = index;
    const m = proofData.matches[index];

    const wrong = proofData.text.substring(m.offset, m.offset + m.length);

    popupWrong.innerHTML = freezeSpaces(escapeHtml(wrong));
    popupCorrect.innerHTML = m.value ? freezeSpaces(escapeHtml(m.value)) : "";

    popupFeedback.innerHTML =
        currentLang === "ko" ? m.feedback_ko : m.feedback;

    popup.style.display = "flex";
}

// ================== 팝업 적용 ==================
function acceptChange() {
    const m = proofData.matches[currentIndex];
    applyOne(m);
    popup.style.display = "none";
    renderTextWithErrors();
}

// ================== 팝업 거부 ==================
function ignoreChange() {
    proofData.matches[currentIndex]._ignored = true;
    popup.style.display = "none";
    renderTextWithErrors();
}

// ================== 단일 적용 ==================
function applyOne(m) {
    if (m._applied) return;

    const before = proofData.text.substring(0, m.offset);
    const after = proofData.text.substring(m.offset + m.length);

    proofData.text = before + m.value + after;
    const diff = m.value.length - m.length;

    // offset 보정
    proofData.matches.forEach(x => {
        if (x.offset > m.offset) x.offset += diff;
    });

    m._applied = true;
}

// ================== 전체 적용 ==================
function applyAll() {
    // offset 증가 때문에 뒤에서부터 적용
    const arr = [...proofData.matches].reverse();

    arr.forEach(m => {
        if (!m._ignored && m.value) applyOne(m);
    });

    renderTextWithErrors();
    textarea.value = proofData.text;
}

// ================== 전체 거부 ==================
function ignoreAll() {
    proofData.matches.forEach(m => (m._ignored = true));
    renderTextWithErrors();
}

// ================== 언어 전환 ==================
function switchLang() {
    currentLang = currentLang === "ko" ? "en" : "ko";

    if (popup.style.display === "flex") {
        const m = proofData.matches[currentIndex];
        popupFeedback.innerHTML =
            currentLang === "ko" ? m.feedback_ko : m.feedback;
    }
}

// ================== 이벤트 연결 ==================
btnStart.onclick = doProofread;
btnApplyAll.onclick = applyAll;
btnIgnoreAll.onclick = ignoreAll;
btnLang.onclick = switchLang;

popupAccept.onclick = acceptChange;
popupIgnore.onclick = ignoreChange;

popup.onclick = e => {
    if (e.target.id === "popup") popup.style.display = "none";
};
