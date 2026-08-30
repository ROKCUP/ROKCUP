// ==========================================
// 🔑 관리자 비밀번호
// ==========================================
const ADMIN_PASSWORD = "1234";

const defaultTeams = [];

function createInitialRanking() {
  const initial = [];
  while (initial.length < 16) {
    initial.push([String(initial.length + 1), "-", "-", "0", "0", "0"]);
  }
  return initial;
}

let isAdmin = false;
let currentMatchIndex = 0;

const $ = s => document.querySelector(s);
const modal = $("#modal");
const adminModal = $("#adminModal");
const teamGrid = $("#teamGrid");

// LocalStorage Helpers
function getApprovedTeams() {
  try {
    const saved = localStorage.getItem("gc_approved_teams");
    return saved ? JSON.parse(saved) : [...defaultTeams];
  } catch { return [...defaultTeams]; }
}

function getPendingTeams() {
  try {
    return JSON.parse(localStorage.getItem("gc_pending_teams")) || [];
  } catch { return []; }
}

function getRankingData() {
  try {
    const saved = localStorage.getItem("gc_ranking_data");
    if (!saved) return createInitialRanking();
    let parsed = JSON.parse(saved);
    while (parsed.length < 16) {
      parsed.push([String(parsed.length + 1), "-", "-", "0", "0", "0"]);
    }
    return parsed.slice(0, 16);
  } catch { return createInitialRanking(); }
}

function getMatchImages() {
  try {
    const saved = localStorage.getItem("gc_match_images");
    return saved ? JSON.parse(saved) : ["", "", "", "", ""];
  } catch { return ["", "", "", "", ""]; }
}

// Render Functions (실시간 팀 카운터 수락 시 자동 업동)
function renderTeams() {
  const teams = getApprovedTeams();
  const count = teams.length;

  // 1. 참가팀 카운터 동적 업데이트 (상단 메타 바 & 참가팀 섹션)
  $("#teamCount").textContent = `${count} / 16 TEAMS`;
  $("#heroTeamCount").textContent = count;

  // 16팀 마감 여부에 따라 배지 노출
  if (count >= 16) {
    $("#closedBadge").style.display = "inline-block";
  } else {
    $("#closedBadge").style.display = "none";
  }
  
  // 2. 참가팀 카드 그리드 그리기
  teamGrid.innerHTML = teams.map((team, i) => `
    <article class="team-card">
      ${isAdmin ? `<button class="card-del-btn" onclick="deleteApprovedTeam(${i})">삭제</button>` : ''}
      <span class="team-no">${String(i + 1).padStart(2, "0")} / TEAM</span>
      <h3>${escapeHtml(team.name)}</h3>
      <div class="players">${team.players.map(escapeHtml).join(" · ")}</div>
    </article>
  `).join("");

  for (let i = teams.length; i < 16; i++) {
    teamGrid.insertAdjacentHTML("beforeend", `<div class="empty">OPEN SLOT<br><span>TEAM ${String(i + 1).padStart(2, "0")}</span></div>`);
  }
}

function renderRanking() {
  const ranking = getRankingData();
  const body = $("#rankingBody");
  
  body.innerHTML = ranking.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td ${isAdmin ? 'contenteditable="true"' : ''}><strong>${escapeHtml(r[1] || '-')}</strong></td>
      <td ${isAdmin ? 'contenteditable="true"' : ''}>${escapeHtml(r[2] || '-')}</td>
      <td ${isAdmin ? 'contenteditable="true"' : ''}>${escapeHtml(r[3] || '0')}</td>
      <td ${isAdmin ? 'contenteditable="true"' : ''}>${escapeHtml(r[4] || '0')}</td>
      <td><strong>${escapeHtml(r[5] || '0')}</strong></td>
      ${isAdmin ? `<td><button class="card-del-btn" onclick="deleteRankingRow(${i})">초기화</button></td>` : ''}
    </tr>
  `).join("");
}

function renderPendingList() {
  const pending = getPendingTeams();
  const container = $("#pendingList");
  
  $("#pendingCount").textContent = pending.length;

  if (pending.length === 0) {
    container.innerHTML = `<p style="color:#64748b; text-align:center; padding:20px 0;">대기 중인 팀 신청이 없습니다.</p>`;
    return;
  }

  container.innerHTML = pending.map((team, index) => `
    <div class="pending-card">
      <div class="pending-info">
        <h4>${escapeHtml(team.name)} <small style="font-size:11px; color:#64748b;">(디스코드: ${escapeHtml(team.discord || '없음')})</small></h4>
        <p>팀장: ${escapeHtml(team.players[0])} / 팀원: ${team.players.slice(1).map(escapeHtml).join(', ')}</p>
      </div>
      <div class="pending-actions">
        <button class="btn-approve" onclick="approveTeam(${index})">승인</button>
        <button class="btn-reject" onclick="rejectTeam(${index})">거절</button>
      </div>
    </div>
  `).join("");
}

function renderMatchDisplay() {
  const images = getMatchImages();
  const currentImg = images[currentMatchIndex];
  const display = $("#matchDisplay");

  if (currentImg) {
    display.innerHTML = `<img src="${currentImg}" alt="Match ${currentMatchIndex + 1} Result">`;
  } else {
    display.innerHTML = `<div class="match-placeholder">MATCH ${currentMatchIndex + 1} 결과 이미지가 아직 등록되지 않았습니다.</div>`;
  }
}

// Tab Switching
document.querySelectorAll(".match-tab").forEach(tab => {
  tab.addEventListener("click", e => {
    document.querySelectorAll(".match-tab").forEach(t => t.classList.remove("active"));
    e.target.classList.add("active");
    currentMatchIndex = parseInt(e.target.dataset.match, 10);
    renderMatchDisplay();
  });
});

// Match Upload Admin
$("#uploadMatchImgBtn")?.addEventListener("click", () => {
  const inputType = prompt(`MATCH ${currentMatchIndex + 1} 이미지 등록 방식을 선택하세요:\n1. URL 입력\n2. 이미지 삭제`, "1");
  const images = getMatchImages();

  if (inputType === "1") {
    const url = prompt("이미지 주소(URL)를 입력해주세요:");
    if (url) {
      images[currentMatchIndex] = url.trim();
      localStorage.setItem("gc_match_images", JSON.stringify(images));
      renderMatchDisplay();
      showToast(`MATCH ${currentMatchIndex + 1} 이미지가 저장되었습니다.`);
    }
  } else if (inputType === "2") {
    images[currentMatchIndex] = "";
    localStorage.setItem("gc_match_images", JSON.stringify(images));
    renderMatchDisplay();
    showToast(`MATCH ${currentMatchIndex + 1} 이미지가 삭제되었습니다.`);
  }
});

// Submit Application
$("#applyForm").addEventListener("submit", e => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const newTeam = {
    name: form.get("team").trim(),
    players: [form.get("captain"), form.get("player2"), form.get("player3"), form.get("player4")].map(v => v.trim()),
    discord: form.get("discord")?.trim() || ""
  };

  const approved = getApprovedTeams();
  const pending = getPendingTeams();

  if (approved.length >= 16) {
    showToast("참가 팀 모집이 이미 마감되었습니다.");
    return;
  }

  const isDuplicate = approved.some(t => t.name.toLowerCase() === newTeam.name.toLowerCase()) ||
                     pending.some(t => t.name.toLowerCase() === newTeam.name.toLowerCase());

  if (isDuplicate) {
    showToast("이미 사용 중이거나 대기 중인 팀명입니다.");
    return;
  }

  pending.push(newTeam);
  localStorage.setItem("gc_pending_teams", JSON.stringify(pending));

  e.currentTarget.reset();
  closeModal();
  renderPendingList();
  showToast("신청이 완료되었습니다! 관리자 승인 후 등록됩니다.");
});

// Admin Team Actions
window.deleteApprovedTeam = function(index) {
  if (!confirm("이 팀을 참가 명단에서 삭제하시겠습니까?")) return;
  const teams = getApprovedTeams();
  const removedTeam = teams.splice(index, 1)[0];
  localStorage.setItem("gc_approved_teams", JSON.stringify(teams));
  
  if (removedTeam) {
    const ranking = getRankingData();
    const rankIndex = ranking.findIndex(r => r[1] === removedTeam.name);
    if (rankIndex !== -1) {
      ranking[rankIndex] = [String(rankIndex + 1), "-", "-", "0", "0", "0"];
      localStorage.setItem("gc_ranking_data", JSON.stringify(ranking));
      renderRanking();
    }
  }

  renderTeams();
  showToast("팀이 삭제되었습니다.");
};

window.approveTeam = function(index) {
  const pending = getPendingTeams();
  const approved = getApprovedTeams();

  if (approved.length >= 16) {
    showToast("16팀 슬롯이 마감되었습니다.");
    return;
  }

  const team = pending.splice(index, 1)[0];
  approved.push(team);

  localStorage.setItem("gc_pending_teams", JSON.stringify(pending));
  localStorage.setItem("gc_approved_teams", JSON.stringify(approved));

  const ranking = getRankingData();
  const emptyIndex = ranking.findIndex(r => r[1] === "-" || r[1] === "");
  if (emptyIndex !== -1) {
    ranking[emptyIndex][1] = team.name;
    ranking[emptyIndex][2] = team.players[0];
    localStorage.setItem("gc_ranking_data", JSON.stringify(ranking));
    renderRanking();
  }

  renderTeams(); // 팀 카운터도 자동으로 1/16 -> 2/16 업데이트
  renderPendingList();
  showToast(`'${team.name}' 팀이 승인되었습니다.`);
};

window.rejectTeam = function(index) {
  const pending = getPendingTeams();
  pending.splice(index, 1);
  localStorage.setItem("gc_pending_teams", JSON.stringify(pending));
  renderPendingList();
  showToast("신청을 거절했습니다.");
};

window.deleteRankingRow = function(index) {
  if (!confirm("이 순위 행을 초기화하시겠습니까?")) return;
  const ranking = getRankingData();
  ranking[index] = [String(index + 1), "-", "-", "0", "0", "0"];
  localStorage.setItem("gc_ranking_data", JSON.stringify(ranking));
  renderRanking();
  showToast("행이 초기화되었습니다.");
};

// Ranking Sort
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

  localStorage.setItem("gc_ranking_data", JSON.stringify(newRanking));
  renderRanking();
  showToast("총점이 순위별로 재정렬되었습니다.");
});

// Admin Auth
$("#adminToggleBtn").addEventListener("click", () => {
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

$("#adminLogoutBtn").addEventListener("click", () => {
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

function openModal() { modal.classList.add("open"); document.body.style.overflow = "hidden"; }
function closeModal() { modal.classList.remove("open"); document.body.style.overflow = ""; }

document.querySelectorAll(".open-modal-btn").forEach(btn => {
  btn.addEventListener("click", openModal);
});

$("#closeModal").addEventListener("click", closeModal);
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

$("#openPendingBtn").addEventListener("click", () => adminModal.classList.add("open"));
$("#closeAdminModal").addEventListener("click", () => adminModal.classList.remove("open"));
adminModal.addEventListener("click", e => { if (e.target === adminModal) adminModal.classList.remove("open"); });

document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeModal(); adminModal.classList.remove("open"); }
});

function showToast(text) {
  const t = $("#toast"); t.textContent = text; t.classList.add("show");
  clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

$("#menuBtn").addEventListener("click", () => $("#navMenu").classList.toggle("open"));
document.querySelectorAll("#navMenu a").forEach(a => a.addEventListener("click", () => $("#navMenu").classList.remove("open")));

// Init
renderTeams();
renderRanking();
renderPendingList();
renderMatchDisplay();