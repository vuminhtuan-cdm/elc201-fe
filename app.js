// app.js - Logic Web Ôn tập & Thi thử ELC201 (Hỗ trợ 5 đề riêng lẻ & Đề Tổng hợp 250 câu)

let currentExamIdx = 0;
let currentMode = 'study'; // 'study' | 'exam' | 'review'

let examState = {
  selectedQuestionCount: 50, // 50 | 100 | 250 (dành cho đề tổng hợp)
  shuffledQuestions: [],
  userAnswers: {}, // { questionId: 'A' | 'B' | 'C' | 'D' }
  flaggedQuestions: {}, // { questionId: true/false }
  timerInterval: null,
  timeRemaining: 3600, // seconds
  isSubmitted: false,
  score: 0,
  filterWrongOnly: false,
  studyFilterExam: 'ALL' // 'ALL' | 'SU26_FE_HN' | ...
};

// Khởi chạy khi load trang
document.addEventListener('DOMContentLoaded', () => {
  renderHeaderTabs();
  loadCurrentExam();
});

// Render danh sách các tab đề thi (5 đề + 1 đề tổng hợp)
function renderHeaderTabs() {
  const container = document.getElementById('examTabs');
  container.innerHTML = '';
  
  EXAMS_DATA.forEach((exam, idx) => {
    const btn = document.createElement('button');
    const isSpecial = exam.isAll;
    btn.className = `exam-tab-btn ${idx === currentExamIdx ? 'active' : ''} ${isSpecial ? 'special-tab' : ''}`;
    btn.innerHTML = `${isSpecial ? '🔥' : '📝'} ${exam.shortTitle}`;
    btn.onclick = () => selectExam(idx);
    container.appendChild(btn);
  });
}

// Chuyển sang đề thi khác
function selectExam(idx) {
  if (currentMode === 'exam' && !examState.isSubmitted) {
    if (!confirm('Bạn đang làm dở bài thi thử, chuyển đề khác sẽ hủy bài thi hiện tại. Bạn có chắc chắn không?')) {
      return;
    }
    clearInterval(examState.timerInterval);
  }
  
  currentExamIdx = idx;
  renderHeaderTabs();
  setMode('study');
}

// Chuyển đổi giữa chế độ Ôn tập & Thi thử
function setMode(mode) {
  currentMode = mode;
  
  document.getElementById('btnModeStudy').classList.toggle('active', mode === 'study');
  document.getElementById('btnModeExam').classList.toggle('active', mode === 'exam' || mode === 'review');

  if (mode === 'study') {
    clearInterval(examState.timerInterval);
    renderStudyView();
  } else if (mode === 'exam') {
    startNewExamSession();
  } else if (mode === 'review') {
    renderReviewView();
  }
}

function loadCurrentExam() {
  setMode(currentMode);
}

/* ============================================================
   CHẾ ĐỘ 1: ÔN TẬP (HIỆN CÂU HỎI VÀ ĐÁP ÁN ĐỂ HỌC THUỘC)
============================================================ */
function renderStudyView() {
  const exam = EXAMS_DATA[currentExamIdx];
  const container = document.getElementById('appContent');
  const isAll = !!exam.isAll;

  // Lọc câu hỏi nếu là đề tổng hợp
  let filteredQuestions = exam.questions;
  if (isAll && examState.studyFilterExam !== 'ALL') {
    filteredQuestions = exam.questions.filter(q => q.exam_code === examState.studyFilterExam);
  }

  container.innerHTML = `
    <!-- Thống kê phân bố đáp án -->
    <div class="exam-summary-card">
      <div class="summary-header">
        <div>
          <div class="summary-title">📖 CHẾ ĐỘ ÔN TẬP: ${exam.title}</div>
          <div class="summary-meta">Hiển thị trọn vẹn ${exam.total} câu hỏi có sẵn đáp án đúng chuẩn 100%</div>
        </div>
        ${isAll ? `
          <div class="filter-exam-select">
            <label style="font-size: 0.85rem; color: var(--text-muted); margin-right: 8px;">Lọc theo đề gốc:</label>
            <select onchange="changeStudyFilter(this.value)" class="custom-select">
              <option value="ALL" ${examState.studyFilterExam === 'ALL' ? 'selected' : ''}>Tất cả 5 đề (${exam.total} câu)</option>
              <option value="SU26_FE_HN" ${examState.studyFilterExam === 'SU26_FE_HN' ? 'selected' : ''}>Đề 1 (SU26 FE-HN - 50 câu)</option>
              <option value="SU26_RE" ${examState.studyFilterExam === 'SU26_RE' ? 'selected' : ''}>Đề 2 (SU26 RE - 50 câu)</option>
              <option value="SP26_FE" ${examState.studyFilterExam === 'SP26_FE' ? 'selected' : ''}>Đề 3 (SP26 FE - 50 câu)</option>
              <option value="FA25_RE" ${examState.studyFilterExam === 'FA25_RE' ? 'selected' : ''}>Đề 4 (FA25 RE - 50 câu)</option>
              <option value="SU25_FE" ${examState.studyFilterExam === 'SU25_FE' ? 'selected' : ''}>Đề 5 (SU25 Final - 50 câu)</option>
            </select>
          </div>
        ` : ''}
      </div>
      <div class="dist-bar-group">
        <div class="dist-box"><span class="label">Đáp án A:</span> <span class="value">${exam.counts.A} (${Math.round((exam.counts.A / exam.total) * 100)}%)</span></div>
        <div class="dist-box"><span class="label">Đáp án B:</span> <span class="value">${exam.counts.B} (${Math.round((exam.counts.B / exam.total) * 100)}%)</span></div>
        <div class="dist-box"><span class="label">Đáp án C:</span> <span class="value">${exam.counts.C} (${Math.round((exam.counts.C / exam.total) * 100)}%)</span></div>
        <div class="dist-box"><span class="label">Đáp án D:</span> <span class="value">${exam.counts.D} (${Math.round((exam.counts.D / exam.total) * 100)}%)</span></div>
      </div>
    </div>

    <div class="layout-with-sidebar">
      <!-- Cột câu hỏi -->
      <div class="questions-column">
        ${filteredQuestions.map((q, idx) => renderStudyQuestionCard(q, idx + 1)).join('')}
      </div>

      <!-- Cột sidebar tra cứu nhanh -->
      <aside class="sidebar-sticky">
        <div class="sidebar-card">
          <div class="nav-grid-title">
            <span>DANH SÁCH (${filteredQuestions.length} CÂU)</span>
            <span style="color: var(--primary);">Bấm để nhảy</span>
          </div>
          <div class="nav-grid ${filteredQuestions.length > 50 ? 'dense-grid' : ''}">
            ${filteredQuestions.map((q, idx) => `
              <button class="nav-btn" onclick="scrollToQuestion('study-q-${q.id}')">
                ${idx + 1}
              </button>
            `).join('')}
          </div>
          <button class="btn-submit-exam" style="margin-top: 18px;" onclick="setMode('exam')">
            🚀 Chuyển sang Thi Thử Ngay
          </button>
        </div>
      </aside>
    </div>
  `;

  if (window.renderMathInElement) {
    renderMathInElement(container, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ]
    });
  }
}

function changeStudyFilter(val) {
  examState.studyFilterExam = val;
  renderStudyView();
}

function renderStudyQuestionCard(q, displayNum) {
  return `
    <div class="question-card" id="study-q-${q.id}">
      <div class="q-top-row">
        <span class="q-badge">Câu ${displayNum} ${q.exam_source ? `· [${q.exam_source}]` : ''}</span>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${q.chapter_name || 'ELC201'}</span>
      </div>

      ${q.content ? `<div class="q-text">${escapeHtml(q.content)}</div>` : ''}

      ${q.image_url ? `
        <div class="q-image-wrap">
          <img src="${q.image_url}" loading="lazy" alt="Câu hỏi ${displayNum}">
        </div>
      ` : ''}

      <div class="options-container">
        ${q.options.map(opt => {
          const isCorrect = opt.is_correct || opt.label === q.correct_answer;
          return `
            <div class="option-row ${isCorrect ? 'is-correct-ans' : ''}">
              <div class="option-letter">${opt.label}</div>
              <div class="option-body">${escapeHtml(opt.content || '')}</div>
              ${isCorrect ? `<span class="answer-pill correct">✓ ĐÁP ÁN ĐÚNG</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/* ============================================================
   CHẾ ĐỘ 2: THI THỬ (TRÁO CÂU, TÙY CHỌN 50/100/250 CÂU, CHẤM ĐIỂM)
============================================================ */
function startNewExamSession(customCount) {
  const exam = EXAMS_DATA[currentExamIdx];
  const isAll = !!exam.isAll;

  // Xác định số lượng câu thi
  let qCount = 50;
  let timeInSeconds = 3600; // 60 phút

  if (isAll) {
    qCount = customCount || examState.selectedQuestionCount || 50;
    examState.selectedQuestionCount = qCount;
    if (qCount === 250) {
      timeInSeconds = 10800; // 180 phút
    } else if (qCount === 100) {
      timeInSeconds = 6000; // 100 phút
    } else {
      timeInSeconds = 3600; // 60 phút cho 50 câu
    }
  } else {
    qCount = exam.questions.length;
    timeInSeconds = 3600;
  }

  // Tráo toàn bộ câu hỏi bằng Fisher-Yates
  const shuffledAll = JSON.parse(JSON.stringify(exam.questions));
  for (let i = shuffledAll.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledAll[i], shuffledAll[j]] = [shuffledAll[j], shuffledAll[i]];
  }

  // Rút đúng số câu đã chọn
  examState.shuffledQuestions = shuffledAll.slice(0, qCount);
  examState.userAnswers = {};
  examState.flaggedQuestions = {};
  examState.isSubmitted = false;
  examState.timeRemaining = timeInSeconds;
  examState.filterWrongOnly = false;

  // Bắt đầu đếm ngược
  clearInterval(examState.timerInterval);
  examState.timerInterval = setInterval(() => {
    examState.timeRemaining--;
    updateTimerDisplay();
    if (examState.timeRemaining <= 0) {
      clearInterval(examState.timerInterval);
      alert('Hết giờ làm bài! Hệ thống sẽ tự động nộp bài thi của bạn.');
      submitExam();
    }
  }, 1000);

  renderExamView();
}

function updateTimerDisplay() {
  const el = document.getElementById('examTimer');
  if (!el) return;
  const hours = Math.floor(examState.timeRemaining / 3600);
  const m = Math.floor((examState.timeRemaining % 3600) / 60);
  const s = examState.timeRemaining % 60;

  if (hours > 0) {
    el.textContent = `${hours}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  } else {
    el.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  if (examState.timeRemaining < 300) {
    el.classList.add('warning');
  } else {
    el.classList.remove('warning');
  }
}

function renderExamView() {
  const exam = EXAMS_DATA[currentExamIdx];
  const container = document.getElementById('appContent');
  const isAll = !!exam.isAll;
  const total = examState.shuffledQuestions.length;

  container.innerHTML = `
    <div class="layout-with-sidebar">
      <div class="questions-column" id="examQuestionsCol">
        <div class="exam-summary-card" style="margin-bottom: 20px;">
          <div class="summary-header">
            <div>
              <div class="summary-title">⏱️ ĐANG THI THỬ: ${exam.shortTitle}</div>
              <div class="summary-meta">Đã tráo ngẫu nhiên ${total} câu hỏi · Làm bài nghiêm túc</div>
            </div>
            ${isAll ? `
              <div class="test-size-selector">
                <span style="font-size: 0.85rem; color: var(--text-muted); margin-right: 6px;">Chọn số câu:</span>
                <button class="size-pill ${total === 50 ? 'active' : ''}" onclick="startNewExamSession(50)">50 câu (60p)</button>
                <button class="size-pill ${total === 100 ? 'active' : ''}" onclick="startNewExamSession(100)">100 câu (100p)</button>
                <button class="size-pill ${total === 250 ? 'active' : ''}" onclick="startNewExamSession(250)">Cả 250 câu (180p)</button>
              </div>
            ` : ''}
          </div>
        </div>

        ${examState.shuffledQuestions.map((q, idx) => renderExamQuestionCard(q, idx + 1)).join('')}
      </div>

      <aside class="sidebar-sticky">
        <div class="sidebar-card">
          <div class="timer-box">
            <span class="timer-label">THỜI GIAN CÒN LẠI</span>
            <span class="timer-value" id="examTimer">--:--</span>
          </div>

          <div class="nav-grid-title">
            <span>BẢNG CÂU HỎI (${total})</span>
            <span id="answeredCount">Đã làm: 0/${total}</span>
          </div>

          <div class="nav-grid ${total > 50 ? 'dense-grid' : ''}" id="examNavGrid">
            ${examState.shuffledQuestions.map((q, idx) => `
              <button class="nav-btn" id="nav-btn-${q.id}" onclick="scrollToQuestion('exam-q-${q.id}')">
                ${idx + 1}
              </button>
            `).join('')}
          </div>

          <button class="btn-submit-exam" onclick="confirmSubmitExam()">
            ✅ Nộp Bài Thi
          </button>
          <button class="btn-secondary" onclick="restartExam()">
            🔄 Thi Lại (Tráo câu mới)
          </button>
        </div>
      </aside>
    </div>
  `;

  updateTimerDisplay();
  updateNavGridState();

  if (window.renderMathInElement) {
    renderMathInElement(container, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ]
    });
  }
}

function renderExamQuestionCard(q, displayNum) {
  const selected = examState.userAnswers[q.id];
  const isFlagged = examState.flaggedQuestions[q.id];

  return `
    <div class="question-card ${selected ? 'answered' : ''} ${isFlagged ? 'flagged' : ''}" id="exam-q-${q.id}">
      <div class="q-top-row">
        <span class="q-badge">Câu ${displayNum} ${q.exam_source ? `· [${q.exam_source}]` : ''}</span>
        <div class="q-actions">
          <button class="btn-flag ${isFlagged ? 'active' : ''}" onclick="toggleFlag('${q.id}')">
            🚩 Đánh dấu xem lại
          </button>
        </div>
      </div>

      ${q.content ? `<div class="q-text">${escapeHtml(q.content)}</div>` : ''}

      ${q.image_url ? `
        <div class="q-image-wrap">
          <img src="${q.image_url}" loading="lazy" alt="Câu hỏi ${displayNum}">
        </div>
      ` : ''}

      <div class="options-container">
        ${q.options.map(opt => `
          <div class="option-row ${selected === opt.label ? 'selected' : ''}" onclick="selectAnswer('${q.id}', '${opt.label}')">
            <div class="option-letter">${opt.label}</div>
            <div class="option-body">${escapeHtml(opt.content || '')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function selectAnswer(questionId, optionLabel) {
  if (examState.isSubmitted) return;
  
  examState.userAnswers[questionId] = optionLabel;
  
  const card = document.getElementById(`exam-q-${questionId}`);
  if (card) {
    card.classList.add('answered');
    card.querySelectorAll('.option-row').forEach(row => {
      const label = row.querySelector('.option-letter').textContent.trim();
      row.classList.toggle('selected', label === optionLabel);
    });
  }

  updateNavGridState();
}

function toggleFlag(questionId) {
  examState.flaggedQuestions[questionId] = !examState.flaggedQuestions[questionId];
  const card = document.getElementById(`exam-q-${questionId}`);
  if (card) {
    card.classList.toggle('flagged', examState.flaggedQuestions[questionId]);
    const flagBtn = card.querySelector('.btn-flag');
    if (flagBtn) {
      flagBtn.classList.toggle('active', examState.flaggedQuestions[questionId]);
    }
  }
  updateNavGridState();
}

function updateNavGridState() {
  const answeredCountEl = document.getElementById('answeredCount');
  let answeredNum = 0;
  const total = examState.shuffledQuestions.length;

  examState.shuffledQuestions.forEach((q, idx) => {
    const btn = document.getElementById(`nav-btn-${q.id}`);
    if (!btn) return;

    const isAnswered = !!examState.userAnswers[q.id];
    const isFlagged = !!examState.flaggedQuestions[q.id];

    if (isAnswered) answeredNum++;

    btn.className = 'nav-btn';
    if (isAnswered) btn.classList.add('answered');
    if (isFlagged) btn.classList.add('flagged');
  });

  if (answeredCountEl) {
    answeredCountEl.textContent = `Đã làm: ${answeredNum}/${total}`;
  }
}

function confirmSubmitExam() {
  const total = examState.shuffledQuestions.length;
  const answered = Object.keys(examState.userAnswers).length;
  const unanswered = total - answered;

  let msg = 'Bạn có chắc chắn muốn nộp bài thi không?';
  if (unanswered > 0) {
    msg = `Bạn còn ${unanswered} câu chưa làm. Bạn có chắc chắn muốn nộp bài ngay bây giờ?`;
  }

  if (confirm(msg)) {
    submitExam();
  }
}

function submitExam() {
  clearInterval(examState.timerInterval);
  examState.isSubmitted = true;

  let correctCount = 0;
  examState.shuffledQuestions.forEach(q => {
    const userChoice = examState.userAnswers[q.id];
    if (userChoice === q.correct_answer) {
      correctCount++;
    }
  });

  examState.score = correctCount;
  const total = examState.shuffledQuestions.length;
  const score10 = ((correctCount / total) * 10).toFixed(1);
  const percent = Math.round((correctCount / total) * 100);

  showResultModal(correctCount, total, score10, percent);
}

function showResultModal(correct, total, score10, percent) {
  const modal = document.getElementById('resultModal');
  const icon = document.getElementById('resIcon');
  const title = document.getElementById('resTitle');
  const scoreEl = document.getElementById('resScore');
  const subEl = document.getElementById('resSub');
  const countCorrect = document.getElementById('resCountCorrect');
  const countWrong = document.getElementById('resCountWrong');
  const countPercent = document.getElementById('resPercent');

  scoreEl.textContent = `${score10} / 10`;
  subEl.textContent = `Làm đúng ${correct} / ${total} câu hỏi`;
  countCorrect.textContent = correct;
  countWrong.textContent = total - correct;
  countPercent.textContent = `${percent}%`;

  if (percent >= 80) {
    icon.textContent = '🎉';
    title.textContent = 'XUẤT SẮC! BẠN ĐẠT KẾT QUẢ RẤT CAO!';
  } else if (percent >= 50) {
    icon.textContent = '👍';
    title.textContent = 'ĐẠT YÊU CẦU! TIẾP TỤC LUYỆN ĐỂ NẮM CHẮC!';
  } else {
    icon.textContent = '💪';
    title.textContent = 'HÃY ÔN LẠI CÁC CÂU SAI ĐỂ ĐẠT ĐIỂM CAO HƠN!';
  }

  modal.classList.add('active');
}

function closeModalAndReview() {
  document.getElementById('resultModal').classList.remove('active');
  setMode('review');
}

function restartExam() {
  document.getElementById('resultModal').classList.remove('active');
  startNewExamSession();
}

/* ============================================================
   CHẾ ĐỘ 3: XEM LẠI KẾT QUẢ THI THỬ (REVIEW ĐÚNG / SAI)
============================================================ */
function renderReviewView() {
  const exam = EXAMS_DATA[currentExamIdx];
  const container = document.getElementById('appContent');
  const total = examState.shuffledQuestions.length;
  const correct = examState.score;
  const score10 = ((correct / total) * 10).toFixed(1);

  const questionsToDisplay = examState.filterWrongOnly
    ? examState.shuffledQuestions.filter(q => examState.userAnswers[q.id] !== q.correct_answer)
    : examState.shuffledQuestions;

  container.innerHTML = `
    <div class="review-banner">
      <div class="review-banner-text">
        <h3>📊 KẾT QUẢ THI THỬ: ${correct}/${total} CÂU ĐÚNG (${score10} điểm)</h3>
        <p>Màu xanh là đáp án đúng chính xác · Màu đỏ là đáp án bạn đã chọn sai.</p>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="btn-action ${examState.filterWrongOnly ? 'active' : ''}" onclick="toggleFilterWrong()">
          ${examState.filterWrongOnly ? `👁️ Xem lại tất cả ${total} câu` : `❌ Chỉ xem ${total - correct} câu làm sai`}
        </button>
        <button class="btn-action" onclick="restartExam()">
          🔄 Thi Lại Đề Này
        </button>
      </div>
    </div>

    <div class="layout-with-sidebar">
      <div class="questions-column">
        ${questionsToDisplay.map((q, idx) => renderReviewQuestionCard(q, idx + 1)).join('')}
      </div>

      <aside class="sidebar-sticky">
        <div class="sidebar-card">
          <div class="nav-grid-title">
            <span>KẾT QUẢ CHI TIẾT</span>
            <span style="color: var(--success);">${correct} đúng / ${total - correct} sai</span>
          </div>

          <div class="nav-grid ${total > 50 ? 'dense-grid' : ''}">
            ${examState.shuffledQuestions.map((q, idx) => {
              const isCorrect = examState.userAnswers[q.id] === q.correct_answer;
              return `
                <button class="nav-btn ${isCorrect ? 'result-correct' : 'result-wrong'}" onclick="scrollToQuestion('review-q-${q.id}')">
                  ${idx + 1}
                </button>
              `;
            }).join('')}
          </div>

          <button class="btn-submit-exam" onclick="restartExam()" style="margin-top: 18px;">
            🔄 Thi Lại Đề Này
          </button>
          <button class="btn-secondary" onclick="setMode('study')">
            📖 Quay lại Chế độ Ôn tập
          </button>
        </div>
      </aside>
    </div>
  `;

  if (window.renderMathInElement) {
    renderMathInElement(container, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ]
    });
  }
}

function renderReviewQuestionCard(q, displayNum) {
  const userChoice = examState.userAnswers[q.id];
  const isCorrect = userChoice === q.correct_answer;

  return `
    <div class="question-card" id="review-q-${q.id}" style="border-left: 5px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'}">
      <div class="q-top-row">
        <span class="q-badge" style="background: ${isCorrect ? 'var(--success-bg)' : 'var(--danger-bg)'}; color: ${isCorrect ? 'var(--success)' : 'var(--danger)'}">
          Câu ${displayNum} · ${isCorrect ? '✓ BẠN ĐÃ TRẢ LỜI ĐÚNG' : '✗ BẠN ĐÃ TRẢ LỜI SAI'} ${q.exam_source ? `· [${q.exam_source}]` : ''}
        </span>
        <span style="font-size: 0.85rem; color: var(--text-muted);">${q.chapter_name || 'ELC201'}</span>
      </div>

      ${q.content ? `<div class="q-text">${escapeHtml(q.content)}</div>` : ''}

      ${q.image_url ? `
        <div class="q-image-wrap">
          <img src="${q.image_url}" loading="lazy" alt="Câu hỏi ${displayNum}">
        </div>
      ` : ''}

      <div class="options-container">
        ${q.options.map(opt => {
          const isThisCorrect = opt.label === q.correct_answer;
          const isUserSelected = userChoice === opt.label;

          let rowClass = '';
          let pill = '';

          if (isThisCorrect) {
            rowClass = 'is-correct-ans';
            pill = `<span class="answer-pill correct">✓ ĐÁP ÁN ĐÚNG</span>`;
          } else if (isUserSelected && !isThisCorrect) {
            rowClass = 'user-wrong';
            pill = `<span class="answer-pill wrong">✗ BẠN CHỌN ĐÁP ÁN NÀY</span>`;
          }

          return `
            <div class="option-row ${rowClass}">
              <div class="option-letter">${opt.label}</div>
              <div class="option-body">${escapeHtml(opt.content || '')}</div>
              ${pill}
            </div>
          `;
        }).join('')}
      </div>

      ${!userChoice ? `
        <div style="margin-top: 10px; font-size: 0.85rem; color: var(--danger);">
          ⚠️ Câu này bạn đã bỏ trống không chọn đáp án.
        </div>
      ` : ''}
    </div>
  `;
}

function toggleFilterWrong() {
  examState.filterWrongOnly = !examState.filterWrongOnly;
  renderReviewView();
}

function scrollToQuestion(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
