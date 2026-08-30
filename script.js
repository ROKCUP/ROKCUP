// ==========================================
// 🔑 Firebase SDK 불러오기 & 설정 (ES Module)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAel5BRjQ8J7CYEq1NWtWobqHqXy6lbu0k",
  authDomain: "rokcup-75b46.firebaseapp.com",
  projectId: "rokcup-75b46",
  storageBucket: "rokcup-75b46.firebasestorage.app",
  messagingSenderId: "135417595694",
  appId: "1:135417595694:web:70c74a7095a127f3d49cbf",
  measurementId: "G-V38XR50YWH",
  databaseURL: "https://rokcup-75b46-default-rtdb.firebaseio.com"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==========================================
// 🔑 관리자 비밀번호
// ==========================================
const ADMIN_PASSWORD = "1213RoK";

let approvedTeams = [];
let pendingTeams = [];
let rankingData = [];
let matchImages = ["", "", "", "", ""];

let isAdmin = false;
let currentMatchIndex = 0;

const $ = s => document.querySelector(s);
const modal = $("#modal");
const adminModal = $("#adminModal");
const teamGrid = $("#teamGrid");

function createInitialRanking() {
  const initial = [];
  while (initial.length < 16) {
    initial.push([String(initial.length + 1), "-", "-", "0", "0", "0"]);
  }
  return initial;
}

// ==========================================
// 🔄 Firebase 실시간 데이터 동기화 (Realtime Listeners)
// ==========================================

// 1. 승인된 팀 목록 감지
onValue(ref(db, "approved_teams"), (snapshot) => {
  const val = snapshot.val();
  approvedTeams = val ? val : [];
  renderTeams();
});

// 2. 대기 팀 목록 감지
onValue(ref(db, "pending_teams"), (snapshot) => {
  const val = snapshot.val();
  pendingTeams = val ? val : [];
  renderPendingList();
});

// 3. 순위표 감지
onValue(ref(db, "ranking_data"), (snapshot) => {
  const val = snapshot.val();
  if (!val) {
    rankingData = createInitialRanking();
  } else {
    let parsed = val;
    while (parsed.length < 16) {
      parsed.push([String(parsed.length + 1), "-", "-", "0", "0", "0"]);
    }
    rankingData = parsed.slice(0, 16);
  }
  renderRanking();
});

// 4. 매치 결과 이미지 감지
onValue(ref(db, "match_images"), (snapshot) => {
  const val = snapshot.val();
  matchImages = val ? val : ["", "", "", "", ""];
  renderMatchDisplay();
});

// ==========================================
// 🎨 Render Functions (화면 그리기)
// ==========================================

function renderTeams() {
  const count = approvedTeams.length;

  if ($("#teamCount")) $("#teamCount").textContent = `${count} / 16 TEAMS`;
  if ($("#heroTeamCount")) $("#heroTeamCount").textContent = count;

  if ($("#closedBadge")) {
    $("#closedBadge").style.display = count >= 16 ? "inline-block" : "none";
  }

  if (teamGrid) {
    teamGrid.innerHTML = approvedTeams.map((team, i) => `
      <article class="team-card">
        ${isAdmin ? `<button class="card-del-btn" data-del-team="${i}">삭제</button>` : ''}
        <span class="team-no">${String(i + 1).padStart(2, "0")} / TEAM</span>
        <h3>${escapeHtml(team.name)}</h3>
        <div class="players">${team.players.map(escapeHtml).join(" · ")}</div>
      </article>
    `).join("");

    for (let i = approvedTeams.length; i < 16; i++) {
      teamGrid.insertAdjacentHTML("beforeend", `<div class="empty">OPEN SLOT<br><span>TEAM ${String(i + 1).padStart(2, "0")}</span></div>`);
    }

    // 팀 삭제 버튼 이벤트 바인딩
    teamGrid.querySelectorAll("[data-del-team]").forEach(btn => {
      btn.addEventListener("click", e => {
        const idx = parseInt(e.target.dataset.delTeam, 10);
        deleteApprovedTeam(idx);
      });
    });
  }
}

function renderRanking() {
  const body = $("#rankingBody");
  if (!body) return;

  body.innerHTML = rankingData.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td ${isAdmin ? 'contenteditable="true"' : ''}><strong>${escapeHtml(r[1] || '-')}</strong></td>
      <td ${isAdmin ? 'contenteditable="true"' : ''}>${escapeHtml(r[2] || '-')}</td>
      <td ${isAdmin ? 'contenteditable="true"' : ''}>${escapeHtml(r[3] || '0')}</td>
      <td ${isAdmin ? 'contenteditable="true"' : ''}>${escapeHtml(r[4] || '0')}</td>
      <td><strong>${escapeHtml(r[5] || '0')}</strong></td>
      ${isAdmin ? `<td><button class="card-del-btn" data-del-rank="${i}">초기화</button></td>` : ''}
    </tr>
  `).join("");

  // 순위 행 초기화 버튼 이벤트 바인딩
  body.querySelectorAll("[data-del-rank]").forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = parseInt(e.target.dataset.delRank, 10);
      deleteRankingRow(idx);
    });
  });
}

function renderPendingList() {
  const container = $("#pendingList");
  if (!container) return;

  if ($("#pendingCount")) $("#pendingCount").textContent = pendingTeams.length;

  if (pendingTeams.length === 0) {
    container.innerHTML = `<p style="color:#64748b; text-align:center; padding:20px 0;">대기 중인 팀 신청이 없습니다.</p>`;
    return;
  }

  container.innerHTML = pendingTeams.map((team, index) => `
    <div class="pending-card">
      <div class="pending-info">
        <h4>${escapeHtml(team.name)} <small style="font-size:11px; color:#64748b;">(디스코드: ${escapeHtml(team.discord || '없음')})</small></h4>
        <p>팀장: ${escapeHtml(team.players[0])} / 팀원: ${team.players.slice(1).map(escapeHtml).join(', ')}</p>
      </div>
      <div class="pending-actions">
        <button class="btn-approve" data-approve="${index}">승인</button>
        <button class="btn-reject" data-reject="${index}">거절</button>
      </div>
    </div>
  `).join("");

  // 승인/거절 버튼 이벤트 바인딩
  container.querySelectorAll("[data-approve]").forEach(btn => {
    btn.addEventListener("click", e => approveTeam(parseInt(e.target.dataset.approve, 10)));
  });
  container.querySelectorAll("[data-reject]").forEach(btn => {
    btn.addEventListener("click", e => rejectTeam(parseInt(e.target.dataset.reject, 10)));
  });
}

function renderMatchDisplay() {
  const currentImg = matchImages[currentMatchIndex];
  const display = $("#matchDisplay");
  if (!display) return;

  if (currentImg) {
    display.innerHTML = `<img src="${currentImg}" alt="Match ${currentMatchIndex + 1} Result">`;
  } else {
    display.innerHTML = `<div class="match-placeholder">MATCH ${currentMatchIndex + 1} 결과 이미지가 아직 등록되지 않았습니다.</div>`;
  }
}

// ==========================================
// 🖱️ Event Listeners & Handlers
// ==========================================

document.querySelectorAll(".match-tab").forEach(tab => {
  tab.addEventListener("click", e => {
    document.querySelectorAll(".match-tab").forEach(t => t.classList.remove("active"));
    e.target.classList.add("active");
    currentMatchIndex = parseInt(e.target.dataset.match, 10);
    renderMatchDisplay();
  });
});

// 매치 이미지 관리자 등록
$("#uploadMatchImgBtn")?.addEventListener("click", () => {
  const inputType = prompt(`MATCH ${currentMatchIndex + 1} 이미지 등록 방식을 선택하세요:\n1. URL 입력\n2. 이미지 삭제`, "1");

  if (inputType === "1") {
    const url = prompt("이미지 주소(URL)를 입력해주세요:");
    if (url) {
      matchImages[currentMatchIndex] = url.trim();
      set(ref(db, "match_images"), matchImages);
      showToast(`MATCH ${currentMatchIndex + 1} 이미지가 저장되었습니다.`);
    }
  } else if (inputType === "2") {
    matchImages[currentMatchIndex] = "";
    set(ref(db, "match_images"), matchImages);
    showToast(`MATCH ${currentMatchIndex + 1} 이미지가 삭제되었습니다.`);
  }
});

// 팀 신청 제출
$("#applyForm")?.addEventListener("submit", e => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const newTeam = {
    name: form.get("team").trim(),
    players: [form.get("captain"), form.get("player2"), form.get("player3"), form.get("player4")].map(v => v.trim()),
    discord: form.get("discord")?.trim() || ""
  };

  if (approvedTeams.length >= 16) {
    showToast("참가 팀 모집이 이미 마감되었습니다.");
    return;
  }

  const isDuplicate = approvedTeams.some(t => t.name.toLowerCase() === newTeam.name.toLowerCase()) ||
                      pendingTeams.some(t => t.name.toLowerCase() === newTeam.name.toLowerCase());

  if (isDuplicate) {
    showToast("이미 사용 중이거나 대기 중인 팀명입니다.");
    return;
  }

  pendingTeams.push(newTeam);
  set(ref(db, "pending_teams"), pendingTeams);

  e.currentTarget.reset();
  closeModal();
  showToast("신청이 완료되었습니다! 관리자 승인 후 등록됩니다.");
});

// 관리자 기능: 참가팀 삭제
function deleteApprovedTeam(index) {
  if (!confirm("이 팀을 참가 명단에서 삭제하시겠습니까?")) return;
  const removedTeam = approvedTeams.splice(index, 1)[0];
  set(ref(db, "approved_teams"), approvedTeams);

  if (removedTeam) {
    const rankIndex = rankingData.findIndex(r => r[1] === removedTeam.name);
    if (rankIndex !== -1) {
      rankingData[rankIndex] = [String(rankIndex + 1), "-", "-", "0", "0", "0"];
      set(ref(db, "ranking_data"), rankingData);
    }
  }
  showToast("팀이 삭제되었습니다.");
}

// 관리자 기능: 팀 승인
function approveTeam(index) {
  if (approvedTeams.length >= 16) {
    showToast("16팀 슬롯이 마감되었습니다.");
    return;
  }

  const team = pendingTeams.splice(index, 1)[0];
  approvedTeams.push(team);

  set(ref(db, "pending_teams"), pendingTeams);
  set(ref(db, "approved_teams"), approvedTeams);

  const emptyIndex = rankingData.findIndex(r => r[1] === "-" || r[1] === "");
  if (emptyIndex !== -1) {
    rankingData[emptyIndex][1] = team.name;
    rankingData[emptyIndex][2] = team.players[0];
    set(ref(db, "ranking_data"), rankingData);
  }

  showToast(`'${team.name}' 팀이 승인되었습니다.`);
}

// 관리자 기능: 팀 거절
function rejectTeam(index) {
  pendingTeams.splice(index, 1);
  set(ref(db, "pending_teams"), pendingTeams);
  showToast("신청을 거절했습니다.");
}

// 관리자 기능: 순위 행 초기화
function deleteRankingRow(index) {
  if (!confirm("이 순위 행을 초기화하시겠습니까?")) return;
  rankingData[index] = [String(index + 1), "-", "-", "0", "0", "0"];
  set(ref(db, "ranking_data"), rankingData);
  showToast("행이 초기화되었습니다.");
}

// 순위표 저장 및 자동 정렬
$("#saveRankingBtn")?.addEventListener("click", () => {
  const rows = document.querySelectorAll("#rankingBody tr");
  let newRanking = [];

  rows.forEach((tr, idx) => {
    const tds = tr.querySelectorAll("td");
    if (tds.length >= 6) {
      const teamName = tds[1].innerText.trim();
      const captain = tds[2].innerText.trim();
      const kills = parseInt(tds[3].innerText.replace(/[^0-9]/g, ""), 10) || 0;
      const rankPts = parseInt(tds[4].innerText.replace(/[^0-9]/g, ""), 10) || 0;
      const totalPts = kills + rankPts;

      newRanking.push([
        String(idx + 1),
        teamName,
        captain,
        String(kills),
        String(rankPts),
        String(totalPts)
      ]);
    }
  });

  newRanking.sort((a, b) => {
    const totalA = parseInt(a[5], 10);
    const totalB = parseInt(b[5], 10);
    if (totalB !== totalA) return totalB - totalA;
    return parseInt(b[3], 10) - parseInt(a[3], 10);
  });

  newRanking = newRanking.map((item, idx) => {
    item[0] = String(idx + 1);
    return item;
  });

  rankingData = newRanking;
  set(ref(db, "ranking_data"), rankingData);
  showToast("총점이 순위별로 재정렬 및 실시간 업데이트 되었습니다.");
});

// 관리자 인증
$("#adminToggleBtn")?.addEventListener("click", () => {
  const pw = prompt("관리자 비밀번호를 입력하세요:");
  if (pw === ADMIN_PASSWORD) {
    isAdmin = true;
    $("#adminToggleBtn").style.display = "none";
    $("#adminControls").style.display = "flex";
    document.querySelectorAll(".admin-only-inline").forEach(el => el.style.display = "inline-flex");
    document.querySelectorAll(".admin-col").forEach(el => el.style.display = "table-cell");
    renderTeams();
    renderRanking();
    renderPendingList();
    showToast("관리자 로그인 완료");
  } else if (pw !== null) {
    alert("비밀번호가 올바르지 않습니다.");
  }
});

$("#adminLogoutBtn")?.addEventListener("click", () => {
  isAdmin = false;
  $("#adminToggleBtn").style.display = "block";
  $("#adminControls").style.display = "none";
  document.querySelectorAll(".admin-only-inline").forEach(el => el.style.display = "none");
  document.querySelectorAll(".admin-col").forEach(el => el.style.display = "none");
  renderTeams();
  renderRanking();
  showToast("로그아웃 되었습니다.");
});

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

function openModal() { modal?.classList.add("open"); document.body.style.overflow = "hidden"; }
function closeModal() { modal?.classList.remove("open"); document.body.style.overflow = ""; }

document.querySelectorAll(".open-modal-btn").forEach(btn => {
  btn.addEventListener("click", openModal);
});

$("#closeModal")?.addEventListener("click", closeModal);
modal?.addEventListener("click", e => { if (e.target === modal) closeModal(); });

$("#openPendingBtn")?.addEventListener("click", () => adminModal?.classList.add("open"));
$("#closeAdminModal")?.addEventListener("click", () => adminModal?.classList.remove("open"));
adminModal?.addEventListener("click", e => { if (e.target === adminModal) adminModal?.classList.remove("open"); });

document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeModal(); adminModal?.classList.remove("open"); }
});

function showToast(text) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = text; t.classList.add("show");
  clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

$("#menuBtn")?.addEventListener("click", () => $("#navMenu")?.classList.toggle("open"));
document.querySelectorAll("#navMenu a").forEach(a => a.addEventListener("click", () => $("#navMenu")?.classList.remove("open")));
