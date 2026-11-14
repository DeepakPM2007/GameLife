/* ================================================================
   js/ui/study.js — Study screen (Phase 0 placeholder)
   College subjects, Skill tree, Focus Timer built in Phase 2.
   ================================================================ */

/**
 * Render the Study tab.
 * @param {HTMLElement} container
 * @param {Object}      appState
 */
export function renderStudy(container, appState) {
  const today    = appState.lastOpenDate;
  const dayData  = appState.days[today] || {};
  const focusMin = dayData.focusMin || { college: 0, skill: 0 };

  container.innerHTML = `
    <div class="system-label">[SYSTEM] STUDY INTERFACE</div>

    <!-- Focus minutes today -->
    <div class="panel panel-cut">
      <div class="section-title">Focus Today</div>
      <div class="stat-row">
        <span class="text-int" style="font-weight:700; font-size:.85rem;">INT · College</span>
        <span class="stat-value text-int mono">${focusMin.college} min</span>
      </div>
      <div class="bar-wrap mb-12">
        <div class="bar-fill int" style="width:${Math.min(100, focusMin.college / 1.8)}%;"></div>
      </div>
      <div class="stat-row">
        <span class="text-skl" style="font-weight:700; font-size:.85rem;">SKL · Skill</span>
        <span class="stat-value text-skl mono">${focusMin.skill} min</span>
      </div>
      <div class="bar-wrap">
        <div class="bar-fill skl" style="width:${Math.min(100, focusMin.skill / 1.8)}%;"></div>
      </div>
    </div>

    <div class="panel">
      <div class="system-label">[STUDY — PHASE 2 COMING]</div>
      <div class="placeholder-screen" style="min-height:38vh;">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none"
             stroke="var(--col-int)" stroke-width="1.5" opacity="0.5">
          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
        </svg>
        <h2>Study Interface</h2>
        <p>Focus Timer, subject tracker,<br>Skill tree, and Exam Raids<br>arrive in Phase 2.</p>
      </div>
    </div>

    <!-- Exam list preview -->
    <div class="panel">
      <div class="section-title">Exams (${appState.exams.length})</div>
      ${appState.exams.length === 0
        ? `<p class="muted text-sm">No exams added yet.</p>`
        : appState.exams.map(e =>
            `<div class="stat-row">
               <span class="stat-label">${e.label || e.subject}</span>
               <span class="stat-value mono">${e.date}</span>
             </div>`
          ).join('')
      }
    </div>
  `;
}
