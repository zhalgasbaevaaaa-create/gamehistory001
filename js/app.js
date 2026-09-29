// ==========================================================================
// QAZAQSTAN HISTORY ARENA - MAIN APPLICATION ENGINE
// 52 Students / 8 Teams / 6 Interactive History Games / Full Audio & Projector UX
// ==========================================================================

class HistoryArenaApp {
    constructor() {
        this.storageKey = 'kazakhstan_history_arena_v1';
        this.defaultTeams = [
            { id: 1, name: "1-команда «Сақтар»", avatar: "⚔️", members: 7, score: 0, correct: 0, analysis: 0, speed: 0, games: 0 },
            { id: 2, name: "2-команда «Ботайлықтар»", avatar: "🐎", members: 7, score: 0, correct: 0, analysis: 0, speed: 0, games: 0 },
            { id: 3, name: "3-команда «Андрондықтар»", avatar: "🥉", members: 7, score: 0, correct: 0, analysis: 0, speed: 0, games: 0 },
            { id: 4, name: "4-команда «Беғазы-Дәндібай»", avatar: "🏛️", members: 7, score: 0, correct: 0, analysis: 0, speed: 0, games: 0 },
            { id: 5, name: "5-команда «Алтын адам»", avatar: "👑", members: 6, score: 0, correct: 0, analysis: 0, speed: 0, games: 0 },
            { id: 6, name: "6-команда «Археологтар»", avatar: "🏺", members: 6, score: 0, correct: 0, analysis: 0, speed: 0, games: 0 },
            { id: 7, name: "7-команда «Сарматтар»", avatar: "🏹", members: 6, score: 0, correct: 0, analysis: 0, speed: 0, games: 0 },
            { id: 8, name: "8-команда «Тасмола»", avatar: "☀️", members: 6, score: 0, correct: 0, analysis: 0, speed: 0, games: 0 }
        ];

        this.state = this.loadState();
        this.activeTeamId = 1;

        // Timer
        this.timer = {
            duration: 25,
            remaining: 25,
            interval: null,
            isRunning: false
        };

        // Current active sub-states
        this.currentJeopardyQuestion = null;
        this.currentDetectiveCaseIdx = 0;
        this.currentExpeditionSiteIdx = 0;
        this.currentExpeditionStepIdx = 0;
        this.currentTimeMachineTaskIdx = 0;
        this.currentTimeMachineItems = [];
        this.currentCourtIdx = 0;
        this.currentStrategyIdx = 0;

        this.init();
    }

    loadState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.teams && parsed.teams.length === 8) {
                    if (!parsed.jeopardyStatus) parsed.jeopardyStatus = {};
                    return parsed;
                }
            }
        } catch (e) {
            console.error("LocalStorage load error:", e);
        }
        return {
            teams: JSON.parse(JSON.stringify(this.defaultTeams)),
            jeopardyStatus: {}, // qId -> 'correct' | 'wrong'
            detectiveCompleted: [],
            expeditionCompleted: [],
            timeMachineCompleted: [],
            courtCompleted: [],
            strategyCompleted: []
        };
    }

    saveState() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (e) {
            console.error("LocalStorage save error:", e);
        }
        this.renderScoreboard();
    }

    init() {
        this.bindGlobalEvents();
        this.renderScoreboard();
        this.populateAnsweringSelects();
        this.showView('menu');
        this.initConfetti();
    }

    // ==========================================================================
    // UI ROUTING & NAVIGATION
    // ==========================================================================
    showView(viewName) {
        document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active-view'));
        const target = document.getElementById(`view-${viewName}`);
        if (target) {
            target.classList.add('active-view');
        }
        this.stopTimer();

        // Specific view initializations
        if (viewName === 'jeopardy') {
            this.renderJeopardyBoard();
        } else if (viewName === 'detective') {
            this.renderDetectiveView();
        } else if (viewName === 'expedition') {
            this.renderExpeditionView();
        } else if (viewName === 'timeMachine') {
            this.renderTimeMachineView();
        } else if (viewName === 'court') {
            this.renderCourtView();
        } else if (viewName === 'strategy') {
            this.renderStrategyView();
        } else if (viewName === 'final') {
            this.renderFinalView();
        }
        if (typeof window.scrollTo === 'function') {
            try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) {}
        }
    }

    // ==========================================================================
    // SCOREBOARD & TEAMS MANAGEMENT
    // ==========================================================================
    renderScoreboard() {
        const ribbon = document.getElementById('teams-ribbon');
        if (!ribbon) return;

        ribbon.innerHTML = '';
        this.state.teams.forEach(team => {
            const chip = document.createElement('div');
            chip.className = `team-chip ${team.id === this.activeTeamId ? 'active-team' : ''}`;
            chip.innerHTML = `
                <div class="team-chip-top">
                    <span class="team-avatar">${team.avatar}</span>
                    <span class="team-name-text" title="${team.name}">${team.name}</span>
                    <span class="team-members-count">${team.members} ст.</span>
                </div>
                <div class="team-chip-bottom">
                    <span class="team-score-num">${team.score} ұп.</span>
                    <div class="team-quick-add">
                        <button class="btn-mini-point" data-team="${team.id}" data-pt="10" title="+10">+10</button>
                        <button class="btn-mini-point" data-team="${team.id}" data-pt="-10" title="-10">-10</button>
                    </div>
                </div>
            `;

            chip.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-mini-point')) {
                    const pt = parseInt(e.target.dataset.pt, 10);
                    this.addScore(team.id, pt, 'manual');
                    e.stopPropagation();
                    return;
                }
                this.setActiveTeam(team.id);
            });

            ribbon.appendChild(chip);
        });
    }

    setActiveTeam(teamId) {
        this.activeTeamId = teamId;
        this.renderScoreboard();
        document.querySelectorAll('.answering-select').forEach(sel => {
            sel.value = teamId;
        });
        window.soundManager.playClick();
    }

    addScore(teamId, points, type = 'general') {
        const team = this.state.teams.find(t => t.id === teamId);
        if (!team) return;

        team.score = Math.max(0, team.score + points);
        if (points > 0) {
            team.games += 1;
            if (type === 'correct') team.correct += 1;
            if (type === 'analysis') team.analysis += points;
            if (type === 'speed') team.speed += points;
            window.soundManager.playPointAdd();
        }
        this.saveState();
    }

    populateAnsweringSelects() {
        document.querySelectorAll('.answering-select').forEach(select => {
            select.innerHTML = '';
            this.state.teams.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = `${t.avatar} ${t.name} (${t.score} ұп)`;
                select.appendChild(opt);
            });
            select.value = this.activeTeamId;
            select.addEventListener('change', (e) => {
                this.setActiveTeam(parseInt(e.target.value, 10));
            });
        });
    }

    // ==========================================================================
    // BIG PROJECTOR TIMER ENGINE
    // ==========================================================================
    startTimer(seconds = 25) {
        this.stopTimer();
        this.timer.duration = seconds;
        this.timer.remaining = seconds;
        this.timer.isRunning = true;
        this.updateTimerDisplay();

        this.timer.interval = setInterval(() => {
            if (this.timer.remaining > 0) {
                this.timer.remaining -= 1;
                this.updateTimerDisplay();

                if (this.timer.remaining <= 5 && this.timer.remaining > 0) {
                    window.soundManager.playUrgentTick();
                } else if (this.timer.remaining > 5) {
                    window.soundManager.playTick();
                }

                if (this.timer.remaining === 0) {
                    this.timerTimeout();
                }
            }
        }, 1000);
    }

    pauseResumeTimer() {
        if (!this.timer.isRunning && this.timer.remaining > 0) {
            this.timer.isRunning = true;
            this.timer.interval = setInterval(() => {
                if (this.timer.remaining > 0) {
                    this.timer.remaining -= 1;
                    this.updateTimerDisplay();
                    if (this.timer.remaining <= 5 && this.timer.remaining > 0) {
                        window.soundManager.playUrgentTick();
                    }
                    if (this.timer.remaining === 0) {
                        this.timerTimeout();
                    }
                }
            }, 1000);
        } else {
            this.stopTimer();
        }
    }

    addTimerSeconds(sec) {
        this.timer.remaining += sec;
        this.timer.duration = Math.max(this.timer.duration, this.timer.remaining);
        this.updateTimerDisplay();
        window.soundManager.playClick();
    }

    stopTimer() {
        if (this.timer.interval) {
            clearInterval(this.timer.interval);
            this.timer.interval = null;
        }
        this.timer.isRunning = false;
        document.querySelectorAll('.timer-widget').forEach(tw => tw.classList.remove('urgent'));
    }

    timerTimeout() {
        this.stopTimer();
        window.soundManager.playTimeout();
        document.querySelectorAll('.timer-widget').forEach(tw => tw.classList.add('urgent'));
    }

    updateTimerDisplay() {
        const mm = String(Math.floor(this.timer.remaining / 60)).padStart(2, '0');
        const ss = String(this.timer.remaining % 60).padStart(2, '0');
        const text = `${mm}:${ss}`;
        document.querySelectorAll('.timer-display').forEach(td => td.textContent = text);

        document.querySelectorAll('.timer-widget').forEach(tw => {
            if (this.timer.remaining <= 5 && this.timer.remaining > 0) {
                tw.classList.add('urgent');
            } else {
                tw.classList.remove('urgent');
            }
        });
    }

    // ==========================================================================
    // 1-ОЙЫН: ТАРИХИ JEOPARDY
    // ==========================================================================
    renderJeopardyBoard() {
        const board = document.getElementById('jeopardy-board');
        if (!board) return;
        board.innerHTML = '';

        if (!this.state.jeopardyStatus) this.state.jeopardyStatus = {};

        GAME_DATA.jeopardy.categories.forEach(cat => {
            const col = document.createElement('div');
            col.className = 'jeopardy-col';

            const header = document.createElement('div');
            header.className = 'jeopardy-header-cell';
            header.innerHTML = `<span>${cat.icon}</span><span>${cat.title}</span>`;
            col.appendChild(header);

            // 5 questions per category
            const catQuestions = GAME_DATA.jeopardy.questions.filter(q => q.catId === cat.id);
            catQuestions.forEach(q => {
                const btn = document.createElement('button');
                const status = this.state.jeopardyStatus[q.id];

                if (status === 'correct') {
                    // Дұрыс жауап берілген ұяшық қызыл түске боялсын. Қайтадан ұяшық ашылмасын.
                    btn.className = 'jeopardy-btn answered-correct';
                    btn.innerHTML = `<span>${q.points}</span><span class="cell-status-sub">✓ Дұрыс</span>`;
                    btn.title = "Бұл сұраққа дұрыс жауап берілген (Жабық)";
                } else if (status === 'wrong') {
                    // Қате жауап берілген ұяшық қара түске боялып қайтадан ашуға мүмкіндік болсын.
                    btn.className = 'jeopardy-btn answered-wrong';
                    btn.innerHTML = `<span>${q.points}</span><span class="cell-status-sub">↺ Ашу</span>`;
                    btn.title = "Бұл сұрақта қателік болған. Қайта ашып жауап беруге болады!";
                    btn.addEventListener('click', () => this.openJeopardyModal(q));
                } else {
                    // Ашылмаған ұяшық
                    btn.className = 'jeopardy-btn';
                    btn.innerHTML = `<span>${q.points}</span>`;
                    btn.addEventListener('click', () => this.openJeopardyModal(q));
                }

                col.appendChild(btn);
            });

            board.appendChild(col);
        });
    }

    openJeopardyModal(question) {
        this.currentJeopardyQuestion = question;
        const modal = document.getElementById('jeopardy-modal');
        const catObj = GAME_DATA.jeopardy.categories.find(c => c.id === question.catId);

        document.getElementById('j-modal-cat').textContent = catObj ? catObj.title : 'Сұрақ';
        document.getElementById('j-modal-points').textContent = `+${question.points} ұпай`;
        document.getElementById('j-modal-qtext').textContent = question.question;

        const optsContainer = document.getElementById('j-modal-options');
        optsContainer.innerHTML = '';

        const letters = ['A', 'B', 'C', 'D'];
        question.options.forEach((optText, idx) => {
            const btn = document.createElement('button');
            btn.className = 'btn-option-card';
            btn.dataset.idx = idx;
            btn.innerHTML = `<span class="opt-prefix">${letters[idx]}</span><span>${optText}</span>`;
            btn.addEventListener('click', () => this.handleJeopardyAnswer(idx, btn));
            optsContainer.appendChild(btn);
        });

        // Reset feedback
        const fbBox = document.getElementById('j-modal-feedback');
        fbBox.className = 'modal-feedback-box';
        fbBox.innerHTML = '';

        document.getElementById('j-modal-award-btn').onclick = () => {
            this.addScore(this.activeTeamId, question.points, 'correct');
            this.setJeopardyStatus(question.id, 'correct');
            modal.classList.remove('active');
            this.renderJeopardyBoard();
        };

        modal.classList.add('active');
        this.startTimer(25);
    }

    handleJeopardyAnswer(selectedIdx, btnElement) {
        const q = this.currentJeopardyQuestion;
        const isCorrect = selectedIdx === q.correct;
        const fbBox = document.getElementById('j-modal-feedback');

        if (isCorrect) {
            // Дұрыс жауапты басқанда ғана жасыл түс жансын
            this.stopTimer();
            btnElement.classList.add('correct');
            window.soundManager.playCorrect();

            fbBox.innerHTML = `
                <div class="feedback-title correct">✓ ДҰРЫС ЖАУАП! (+${q.points} ұпай)</div>
                <div class="feedback-explanation">${q.explanation}</div>
            `;
            fbBox.classList.add('active');

            // Disable all other options
            document.querySelectorAll('#j-modal-options .btn-option-card').forEach(b => b.classList.add('disabled'));

            // Award score and mark cell permanently RED on board
            this.addScore(this.activeTeamId, q.points, 'correct');
            this.setJeopardyStatus(q.id, 'correct');
            this.renderJeopardyBoard();
        } else {
            // Тек қате жауап қызыл болып жансын. Дұрыс жауаптар көрсетілмесін!
            btnElement.classList.add('wrong');
            btnElement.classList.add('disabled');
            window.soundManager.playWrong();

            fbBox.innerHTML = `
                <div class="feedback-title wrong">✗ ҚАТЕ ЖАУАП!</div>
                <div class="feedback-explanation">Бұл нұсқа қате. Басқа командалар немесе келесі ойыншы дұрыс нұсқаны табуға жауап бере алады!</div>
            `;
            fbBox.classList.add('active');

            // Қате жауап берілген ұяшық қара түске боялып қайтадан ашуға мүмкіндік болсын
            if (this.state.jeopardyStatus[q.id] !== 'correct') {
                this.setJeopardyStatus(q.id, 'wrong');
                this.renderJeopardyBoard();
            }
        }
    }

    setJeopardyStatus(qId, status) {
        if (!this.state.jeopardyStatus) this.state.jeopardyStatus = {};
        this.state.jeopardyStatus[qId] = status;
        this.saveState();
    }

    // ==========================================
    // 2-ОЙЫН: ТАРИХИ ДЕТЕКТИВ
    // ==========================================
    renderDetectiveView() {
        const caseList = document.getElementById('detective-case-list');
        if (!caseList) return;
        caseList.innerHTML = '';

        GAME_DATA.detective.forEach((detCase, idx) => {
            const btn = document.createElement('button');
            const isCompleted = this.state.detectiveCompleted.includes(detCase.id);
            btn.className = `btn-case-item ${idx === this.currentDetectiveCaseIdx ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
            btn.innerHTML = `<span>${detCase.title}</span>`;
            btn.addEventListener('click', () => {
                this.currentDetectiveCaseIdx = idx;
                this.renderDetectiveView();
            });
            caseList.appendChild(btn);
        });

        const activeCase = GAME_DATA.detective[this.currentDetectiveCaseIdx];
        if (!activeCase) return;

        document.getElementById('det-case-title').textContent = activeCase.title;

        // Render clues
        const cluesUl = document.getElementById('det-clues-list');
        cluesUl.innerHTML = '';
        activeCase.clues.forEach((clue, idx) => {
            const li = document.createElement('li');
            li.className = 'clue-item';
            li.innerHTML = `<strong>Дерек ${idx + 1}:</strong> ${clue}`;
            cluesUl.appendChild(li);
        });

        document.getElementById('det-question-text').textContent = activeCase.question;

        // Options
        const optsContainer = document.getElementById('det-options-grid');
        optsContainer.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];
        activeCase.options.forEach((optText, idx) => {
            const btn = document.createElement('button');
            btn.className = 'btn-option-card';
            btn.innerHTML = `<span class="opt-prefix">${letters[idx]}</span><span>${optText}</span>`;
            btn.addEventListener('click', () => this.handleDetectiveAnswer(idx, activeCase));
            optsContainer.appendChild(btn);
        });

        // Prompt & Notes
        document.getElementById('det-analysis-prompt').textContent = activeCase.analysisPrompt;
        document.getElementById('det-academic-note').textContent = activeCase.academicNote;
        document.getElementById('det-outcome-box').style.display = 'none';

        // Scoring controls
        document.getElementById('det-score-correct-btn').onclick = () => {
            this.addScore(this.activeTeamId, activeCase.scoreCorrect, 'correct');
            this.markDetectiveCompleted(activeCase.id);
        };
        document.getElementById('det-score-evidence-btn').onclick = () => {
            this.addScore(this.activeTeamId, activeCase.scoreEvidence, 'analysis');
            this.markDetectiveCompleted(activeCase.id);
        };

        this.startTimer(30);
    }

    handleDetectiveAnswer(selectedIdx, detCase) {
        const isCorrect = selectedIdx === detCase.correct;
        const outcomeBox = document.getElementById('det-outcome-box');
        const selectedBtn = document.querySelectorAll('#det-options-grid .btn-option-card')[selectedIdx];

        if (isCorrect) {
            this.stopTimer();
            if (selectedBtn) selectedBtn.classList.add('correct');
            document.querySelectorAll('#det-options-grid .btn-option-card').forEach(b => b.classList.add('disabled'));
            window.soundManager.playCorrect();
            this.addScore(this.activeTeamId, detCase.scoreCorrect, 'correct');
            outcomeBox.style.display = 'block';
            this.markDetectiveCompleted(detCase.id);
        } else {
            // Тек қате жауап қызыл болып жанады, дұрыс жауап көрсетілмейді
            if (selectedBtn) {
                selectedBtn.classList.add('wrong');
                selectedBtn.classList.add('disabled');
            }
            window.soundManager.playWrong();
        }
    }

    markDetectiveCompleted(caseId) {
        if (!this.state.detectiveCompleted.includes(caseId)) {
            this.state.detectiveCompleted.push(caseId);
            this.saveState();
            this.renderDetectiveView();
        }
    }

    // ==========================================
    // 3-ОЙЫН: АРХЕОЛОГИЯЛЫҚ ЭКСПЕДИЦИЯ
    // ==========================================
    renderExpeditionView() {
        const site = GAME_DATA.expedition[this.currentExpeditionSiteIdx];
        if (!site) return;

        // Render Map with pins
        this.renderExpeditionMap();

        document.getElementById('exp-site-badge').textContent = `МИССИЯ ${this.currentExpeditionSiteIdx + 1} / 10`;
        document.getElementById('exp-site-name').textContent = site.siteName;
        document.getElementById('exp-site-region').textContent = site.region;
        document.getElementById('exp-site-epoch').textContent = site.epoch;
        document.getElementById('exp-site-significance').textContent = site.significance;

        // Render Step Questions
        const questionsBox = document.getElementById('exp-questions-container');
        questionsBox.innerHTML = '';

        site.stepQuestions.forEach((sq, qIdx) => {
            const qCard = document.createElement('div');
            qCard.className = 'exp-q-card';
            qCard.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid rgba(217,119,6,0.3); border-radius: 8px; padding: 14px; margin-bottom: 12px;';
            qCard.innerHTML = `<div style="font-weight: 700; color: #f59e0b; margin-bottom: 8px;">${sq.q}</div>`;

            const optsGrid = document.createElement('div');
            optsGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';

            sq.options.forEach((optText, oIdx) => {
                const optBtn = document.createElement('button');
                optBtn.className = 'btn-option-card';
                optBtn.style.padding = '8px 12px';
                optBtn.style.fontSize = '14px';
                optBtn.innerHTML = `<span>${optText}</span>`;
                optBtn.addEventListener('click', () => {
                    const isRight = oIdx === sq.correct;
                    if (isRight) {
                        optBtn.classList.add('correct');
                        window.soundManager.playCorrect();
                        this.addScore(this.activeTeamId, 10, 'correct');
                        optsGrid.querySelectorAll('button').forEach(b => b.classList.add('disabled'));
                    } else {
                        // Тек қате жауап қызыл болады, дұрыс жауап көрсетілмейді
                        optBtn.classList.add('wrong');
                        optBtn.classList.add('disabled');
                        window.soundManager.playWrong();
                    }
                });
                optsGrid.appendChild(optBtn);
            });

            qCard.appendChild(optsGrid);
            questionsBox.appendChild(qCard);
        });

        this.startTimer(30);
    }

    renderExpeditionMap() {
        const svgContainer = document.getElementById('kz-map-holder');
        if (!svgContainer) return;

        // Kazakhstan outline stylized SVG
        let pinsSvg = '';
        GAME_DATA.expedition.forEach((item, idx) => {
            const isActive = idx === this.currentExpeditionSiteIdx;
            const isDone = this.state.expeditionCompleted.includes(item.id);
            const fillCol = isDone ? '#10b981' : (isActive ? '#fbbf24' : '#06b6d4');
            pinsSvg += `
                <g class="map-pin ${isActive ? 'active-site' : ''}" data-idx="${idx}" transform="translate(${item.coords.x * 9}, ${item.coords.y * 5})">
                    <circle class="pin-dot" r="8" fill="${fillCol}" stroke="#090d16" stroke-width="2" />
                    <text x="12" y="5" fill="#fff" font-size="12" font-weight="bold" filter="drop-shadow(0 2px 4px #000)">${idx + 1}. ${item.siteName}</text>
                </g>
            `;
        });

        svgContainer.innerHTML = `
            <svg viewBox="0 0 900 500" class="kz-map-svg" xmlns="http://www.w3.org/2000/svg">
                <!-- Kazakhstan stylized contour -->
                <path d="M 90,200 L 150,110 L 250,90 L 380,80 L 490,70 L 600,100 L 720,120 L 830,160 L 870,250 L 820,340 L 760,400 L 680,420 L 590,440 L 500,430 L 410,400 L 300,380 L 200,360 L 110,320 L 70,260 Z" 
                      fill="#131e33" stroke="#d97706" stroke-width="3" stroke-dasharray="2,2" filter="drop-shadow(0 0 15px rgba(217,119,6,0.3))" />
                <path d="M 120,220 Q 250,140 450,130 T 780,180 T 800,320 T 620,400 T 450,380 T 220,330 Z" 
                      fill="#1a2742" stroke="#06b6d4" stroke-width="1.5" opacity="0.8" />
                
                <!-- Major River Arcs (Syrdarya, Irtysh, Esil, Ural) -->
                <path d="M 830,170 Q 750,220 620,130" stroke="#0284c7" stroke-width="2" fill="none" opacity="0.6"/>
                <path d="M 520,430 Q 560,340 410,260" stroke="#0284c7" stroke-width="2" fill="none" opacity="0.6"/>
                <path d="M 110,320 Q 150,200 130,110" stroke="#0284c7" stroke-width="2" fill="none" opacity="0.6"/>

                <!-- Region labels -->
                <text x="450" y="240" fill="#f59e0b" font-size="18" font-family="Cinzel, serif" font-weight="bold" opacity="0.3" text-anchor="middle">ҚАЗАҚСТАН ТАРИХИ АРЕНАСЫ</text>
                
                <!-- Pins -->
                ${pinsSvg}
            </svg>
        `;

        svgContainer.querySelectorAll('.map-pin').forEach(pin => {
            pin.addEventListener('click', () => {
                this.currentExpeditionSiteIdx = parseInt(pin.dataset.idx, 10);
                this.renderExpeditionView();
            });
        });
    }

    nextExpeditionSite() {
        if (!this.state.expeditionCompleted.includes(GAME_DATA.expedition[this.currentExpeditionSiteIdx].id)) {
            this.state.expeditionCompleted.push(GAME_DATA.expedition[this.currentExpeditionSiteIdx].id);
            this.saveState();
        }
        this.currentExpeditionSiteIdx = (this.currentExpeditionSiteIdx + 1) % GAME_DATA.expedition.length;
        this.renderExpeditionView();
    }

    prevExpeditionSite() {
        this.currentExpeditionSiteIdx = (this.currentExpeditionSiteIdx - 1 + GAME_DATA.expedition.length) % GAME_DATA.expedition.length;
        this.renderExpeditionView();
    }

    // ==========================================
    // 4-ОЙЫН: УАҚЫТ МАШИНАСЫ (CHRONOLOGY)
    // ==========================================
    renderTimeMachineView() {
        const task = GAME_DATA.timeMachine[this.currentTimeMachineTaskIdx];
        if (!task) return;

        document.getElementById('tm-task-badge').textContent = `ХРОНОЛОГИЯ ${this.currentTimeMachineTaskIdx + 1} / 10`;
        document.getElementById('tm-task-title').textContent = task.title;
        document.getElementById('tm-task-desc').textContent = task.description;

        // Clone and shuffle items if not loaded
        this.currentTimeMachineItems = [...task.items].sort(() => Math.random() - 0.5);

        this.renderTimeMachineItems();
        document.getElementById('tm-feedback-box').style.display = 'none';
        this.startTimer(30);
    }

    renderTimeMachineItems() {
        const list = document.getElementById('tm-sortable-list');
        if (!list) return;
        list.innerHTML = '';

        this.currentTimeMachineItems.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'timeline-item-card';
            card.draggable = true;
            card.dataset.idx = idx;

            card.innerHTML = `
                <div class="item-left-content">
                    <span class="item-rank-num">${idx + 1}</span>
                    <span class="item-text-title">${item.text}</span>
                </div>
                <div class="item-btn-controls">
                    <button class="btn-move-order btn-move-up" ${idx === 0 ? 'disabled' : ''} title="Жоғары көтеру">▲</button>
                    <button class="btn-move-order btn-move-down" ${idx === this.currentTimeMachineItems.length - 1 ? 'disabled' : ''} title="Төмен түсіру">▼</button>
                </div>
            `;

            // Up/Down button events
            card.querySelector('.btn-move-up').addEventListener('click', (e) => {
                e.stopPropagation();
                if (idx > 0) {
                    const temp = this.currentTimeMachineItems[idx];
                    this.currentTimeMachineItems[idx] = this.currentTimeMachineItems[idx - 1];
                    this.currentTimeMachineItems[idx - 1] = temp;
                    this.renderTimeMachineItems();
                    window.soundManager.playClick();
                }
            });

            card.querySelector('.btn-move-down').addEventListener('click', (e) => {
                e.stopPropagation();
                if (idx < this.currentTimeMachineItems.length - 1) {
                    const temp = this.currentTimeMachineItems[idx];
                    this.currentTimeMachineItems[idx] = this.currentTimeMachineItems[idx + 1];
                    this.currentTimeMachineItems[idx + 1] = temp;
                    this.renderTimeMachineItems();
                    window.soundManager.playClick();
                }
            });

            // Drag & Drop
            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', idx);
            });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
            card.addEventListener('dragover', (e) => e.preventDefault());
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                const toIdx = idx;
                if (!isNaN(fromIdx) && fromIdx !== toIdx) {
                    const movedItem = this.currentTimeMachineItems.splice(fromIdx, 1)[0];
                    this.currentTimeMachineItems.splice(toIdx, 0, movedItem);
                    this.renderTimeMachineItems();
                    window.soundManager.playClick();
                }
            });

            list.appendChild(card);
        });
    }

    checkTimeMachineOrder() {
        this.stopTimer();
        const task = GAME_DATA.timeMachine[this.currentTimeMachineTaskIdx];
        const isCorrect = this.currentTimeMachineItems.every((item, idx) => item.order === (idx + 1));
        const fbBox = document.getElementById('tm-feedback-box');

        if (isCorrect) {
            window.soundManager.playCorrect();
            fbBox.className = 'modal-feedback-box active';
            fbBox.innerHTML = `
                <div class="feedback-title correct">✓ ӨТЕ ТАМАША! ХРОНОЛОГИЯЛЫҚ ТІЗБЕК ДҰРЫС! (+20 ұпай)</div>
                <div class="feedback-explanation">${task.explanation}</div>
            `;
            this.addScore(this.activeTeamId, 20, 'correct');
        } else {
            window.soundManager.playWrong();
            fbBox.className = 'modal-feedback-box active';
            fbBox.innerHTML = `
                <div class="feedback-title wrong">✗ РЕТТІЛІКТЕ ҚАТЕЛІК БАР!</div>
                <div class="feedback-explanation"><strong>Дұрыс тарихи түсініктеме:</strong><br>${task.explanation}</div>
            `;
        }
        fbBox.style.display = 'block';

        if (!this.state.timeMachineCompleted.includes(task.id)) {
            this.state.timeMachineCompleted.push(task.id);
            this.saveState();
        }
    }

    nextTimeMachineTask() {
        this.currentTimeMachineTaskIdx = (this.currentTimeMachineTaskIdx + 1) % GAME_DATA.timeMachine.length;
        this.renderTimeMachineView();
    }

    prevTimeMachineTask() {
        this.currentTimeMachineTaskIdx = (this.currentTimeMachineTaskIdx - 1 + GAME_DATA.timeMachine.length) % GAME_DATA.timeMachine.length;
        this.renderTimeMachineView();
    }

    // ==========================================
    // 5-ОЙЫН: ДӘУІРЛЕР СОТЫ (DEBATE & ANALYSIS)
    // ==========================================
    renderCourtView() {
        const court = GAME_DATA.court[this.currentCourtIdx];
        if (!court) return;

        document.getElementById('court-badge').textContent = `СОТ ІСІ ${this.currentCourtIdx + 1} / 10`;
        document.getElementById('court-title').textContent = court.title;
        document.getElementById('court-dilemma').textContent = court.dilemma;

        const sidesGrid = document.getElementById('court-sides-grid');
        sidesGrid.innerHTML = '';
        court.positions.forEach((pos, idx) => {
            const sideBox = document.createElement('div');
            sideBox.className = 'court-side-box';
            sideBox.innerHTML = `
                <div class="side-header">⚖️ ${pos.name}</div>
                <div class="side-argument-text">${pos.argument}</div>
            `;
            sidesGrid.appendChild(sideBox);
        });

        // Guiding Questions & Facts
        const qList = document.getElementById('court-guiding-list');
        qList.innerHTML = '';
        court.guidingQuestions.forEach(q => {
            const li = document.createElement('li');
            li.style.cssText = 'color: #94a3b8; font-size: 15px; margin-bottom: 6px;';
            li.textContent = q;
            qList.appendChild(li);
        });

        document.getElementById('court-facts-text').textContent = court.historicalFacts;

        // Teacher Rubric Buttons
        document.getElementById('btn-court-evidence').onclick = () => {
            this.addScore(this.activeTeamId, 10, 'analysis');
        };
        document.getElementById('btn-court-fact').onclick = () => {
            this.addScore(this.activeTeamId, 10, 'analysis');
        };
        document.getElementById('btn-court-analysis').onclick = () => {
            this.addScore(this.activeTeamId, 10, 'analysis');
        };
        document.getElementById('btn-court-rhetoric').onclick = () => {
            this.addScore(this.activeTeamId, 10, 'analysis');
        };

        this.startTimer(45);
    }

    nextCourtCase() {
        this.currentCourtIdx = (this.currentCourtIdx + 1) % GAME_DATA.court.length;
        this.renderCourtView();
    }

    prevCourtCase() {
        this.currentCourtIdx = (this.currentCourtIdx - 1 + GAME_DATA.court.length) % GAME_DATA.court.length;
        this.renderCourtView();
    }

    // ==========================================
    // 6-ОЙЫН: ТАРИХИ СТРАТЕГИЯ
    // ==========================================
    renderStrategyView() {
        const strat = GAME_DATA.strategy[this.currentStrategyIdx];
        if (!strat) return;

        document.getElementById('strat-badge').textContent = `СЦЕНАРИЙ ${this.currentStrategyIdx + 1} / 10`;
        document.getElementById('strat-title').textContent = strat.title;
        document.getElementById('strat-context').textContent = strat.context;

        const choicesGrid = document.getElementById('strat-choices-grid');
        choicesGrid.innerHTML = '';

        strat.choices.forEach(ch => {
            const btn = document.createElement('button');
            btn.className = 'btn-strategy-choice';
            btn.innerHTML = `<strong>${ch.text}</strong>`;
            btn.addEventListener('click', () => this.handleStrategyChoice(ch, strat));
            choicesGrid.appendChild(btn);
        });

        document.getElementById('strat-second-prompt').textContent = strat.secondPrompt;
        document.getElementById('strat-academic-lesson').textContent = strat.academicLesson;
        document.getElementById('strat-outcome-box').classList.remove('active');

        this.startTimer(30);
    }

    handleStrategyChoice(choice, strat) {
        this.stopTimer();
        const isBest = choice.id === strat.bestChoice;
        const outcomeBox = document.getElementById('strat-outcome-box');

        document.querySelectorAll('#strat-choices-grid .btn-strategy-choice').forEach(btn => {
            btn.classList.add('disabled');
            if (btn.textContent.includes(choice.text)) {
                btn.classList.add(isBest ? 'selected-best' : 'selected-alt');
            }
        });

        document.getElementById('strat-consequence-text').textContent = choice.consequence;

        if (isBest) {
            window.soundManager.playCorrect();
            this.addScore(this.activeTeamId, 20, 'correct');
        } else {
            window.soundManager.playTick();
            this.addScore(this.activeTeamId, 10, 'analysis');
        }

        outcomeBox.classList.add('active');

        if (!this.state.strategyCompleted.includes(strat.id)) {
            this.state.strategyCompleted.push(strat.id);
            this.saveState();
        }
    }

    nextStrategy() {
        this.currentStrategyIdx = (this.currentStrategyIdx + 1) % GAME_DATA.strategy.length;
        this.renderStrategyView();
    }

    prevStrategy() {
        this.currentStrategyIdx = (this.currentStrategyIdx - 1 + GAME_DATA.strategy.length) % GAME_DATA.strategy.length;
        this.renderStrategyView();
    }

    // ==========================================
    // ҮЛКЕН ФИНАЛ: РЕЙТИНГ ЖӘНЕ САЛТАНАТ
    // ==========================================
    renderFinalView() {
        const sorted = [...this.state.teams].sort((a, b) => b.score - a.score);

        // Podium top 3
        const p1 = sorted[0];
        const p2 = sorted[1];
        const p3 = sorted[2];

        document.getElementById('podium-1-name').textContent = p1.name;
        document.getElementById('podium-1-score').textContent = `${p1.score} ұпай`;
        document.getElementById('podium-2-name').textContent = p2.name;
        document.getElementById('podium-2-score').textContent = `${p2.score} ұпай`;
        document.getElementById('podium-3-name').textContent = p3.name;
        document.getElementById('podium-3-score').textContent = `${p3.score} ұпай`;

        // Full stats table
        const tbody = document.getElementById('final-stats-tbody');
        tbody.innerHTML = '';
        sorted.forEach((team, rank) => {
            const tr = document.createElement('tr');
            const medal = rank === 0 ? '🥇' : (rank === 1 ? '🥈' : (rank === 2 ? '🥉' : `${rank + 1}`));
            tr.innerHTML = `
                <td style="font-weight: 800; font-size: 18px; color: #f59e0b;">${medal}</td>
                <td style="font-weight: 700;">${team.avatar} ${team.name}</td>
                <td>${team.members} студент</td>
                <td><strong>${team.score}</strong></td>
                <td>${team.correct}</td>
                <td>${team.analysis}</td>
                <td>${team.speed}</td>
                <td>${team.games}</td>
            `;
            tbody.appendChild(tr);
        });

        // SVG Visual Bar Chart
        this.renderFinalChart(sorted);

        window.soundManager.playFanfare();
        this.triggerConfetti();
    }

    renderFinalChart(sortedTeams) {
        const chartWrapper = document.getElementById('final-chart-wrapper');
        if (!chartWrapper) return;

        const maxScore = Math.max(...sortedTeams.map(t => t.score), 100);
        let barsSvg = '';

        sortedTeams.forEach((t, idx) => {
            const barWidth = Math.max(10, (t.score / maxScore) * 600);
            const y = idx * 36 + 20;
            barsSvg += `
                <text x="10" y="${y + 16}" fill="#f8fafc" font-size="13" font-weight="bold">${t.name.substring(0, 18)}</text>
                <rect x="180" y="${y}" width="${barWidth}" height="22" rx="4" fill="url(#goldGrad)" opacity="0.9"/>
                <text x="${190 + barWidth}" y="${y + 16}" fill="#fbbf24" font-size="14" font-weight="900">${t.score}</text>
            `;
        });

        chartWrapper.innerHTML = `
            <svg viewBox="0 0 850 320" style="width: 100%; height: 100%;">
                <defs>
                    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#d97706" />
                        <stop offset="100%" stop-color="#fbbf24" />
                    </linearGradient>
                </defs>
                ${barsSvg}
            </svg>
        `;
    }

    // ==========================================
    // TEACHER / MODERATOR PANEL (PIN PROTECTED)
    // ==========================================
    openTeacherModal() {
        const modal = document.getElementById('teacher-modal');
        const rowsContainer = document.getElementById('teacher-teams-edit-list');
        rowsContainer.innerHTML = '';

        this.state.teams.forEach(t => {
            const row = document.createElement('div');
            row.className = 'team-edit-row';
            row.innerHTML = `
                <span style="font-size: 20px;">${t.avatar}</span>
                <input type="text" class="input-dark team-name-input" value="${t.name}" data-id="${t.id}" />
                <input type="number" class="input-dark team-score-input" value="${t.score}" data-id="${t.id}" />
                <input type="number" class="input-dark team-members-input" value="${t.members}" data-id="${t.id}" min="1" max="15" />
            `;
            rowsContainer.appendChild(row);
        });

        modal.classList.add('active');
    }

    saveTeacherChanges() {
        document.querySelectorAll('#teacher-teams-edit-list .team-name-input').forEach(inp => {
            const id = parseInt(inp.dataset.id, 10);
            const team = this.state.teams.find(t => t.id === id);
            if (team) team.name = inp.value;
        });
        document.querySelectorAll('#teacher-teams-edit-list .team-score-input').forEach(inp => {
            const id = parseInt(inp.dataset.id, 10);
            const team = this.state.teams.find(t => t.id === id);
            if (team) team.score = Math.max(0, parseInt(inp.value, 10) || 0);
        });
        document.querySelectorAll('#teacher-teams-edit-list .team-members-input').forEach(inp => {
            const id = parseInt(inp.dataset.id, 10);
            const team = this.state.teams.find(t => t.id === id);
            if (team) team.members = Math.max(1, parseInt(inp.value, 10) || 6);
        });

        this.saveState();
        this.populateAnsweringSelects();
        document.getElementById('teacher-modal').classList.remove('active');
        window.soundManager.playCorrect();
    }

    resetAllGames() {
        if (confirm("БАРЛЫҚ ОЙЫНДЫ НӨЛДЕН ҚАЙТА БАСТАУҒА СЕНІМДІСІЗ БЕ? (Барлық ұпайлар мен тапсырмалар өшіріледі)")) {
            this.state = {
                teams: JSON.parse(JSON.stringify(this.defaultTeams)),
                jeopardyAnswered: [],
                detectiveCompleted: [],
                expeditionCompleted: [],
                timeMachineCompleted: [],
                courtCompleted: [],
                strategyCompleted: []
            };
            this.saveState();
            this.populateAnsweringSelects();
            document.getElementById('teacher-modal').classList.remove('active');
            this.showView('menu');
        }
    }

    // ==========================================
    // CONFETTI ANIMATION ENGINE
    // ==========================================
    initConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        this.confettiCtx = canvas.getContext('2d');
        this.confettiParticles = [];
        this.resizeConfettiCanvas();
        window.addEventListener('resize', () => this.resizeConfettiCanvas());
    }

    resizeConfettiCanvas() {
        const canvas = document.getElementById('confetti-canvas');
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    }

    triggerConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas || !this.confettiCtx) return;

        this.confettiParticles = [];
        const colors = ['#f59e0b', '#fbbf24', '#06b6d4', '#10b981', '#ef4444', '#fff'];

        for (let i = 0; i < 150; i++) {
            this.confettiParticles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                w: Math.random() * 12 + 6,
                h: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: Math.random() * 4 - 2,
                vy: Math.random() * 6 + 3,
                rot: Math.random() * 360,
                vrot: Math.random() * 10 - 5
            });
        }

        let frames = 0;
        const reqAnim = window.requestAnimationFrame || (cb => setTimeout(cb, 16));
        const animate = () => {
            this.confettiCtx.clearRect(0, 0, canvas.width, canvas.height);
            this.confettiParticles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.vrot;

                this.confettiCtx.save();
                this.confettiCtx.translate(p.x, p.y);
                this.confettiCtx.rotate((p.rot * Math.PI) / 180);
                this.confettiCtx.fillStyle = p.color;
                this.confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                this.confettiCtx.restore();
            });

            frames++;
            if (frames < 250) {
                reqAnim(animate);
            } else {
                this.confettiCtx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
        animate();
    }

    // ==========================================
    // GLOBAL EVENTS BINDING
    // ==========================================
    bindGlobalEvents() {
        // Sound toggle
        const sndBtn = document.getElementById('btn-toggle-sound');
        if (sndBtn) {
            sndBtn.addEventListener('click', () => {
                const isEnabled = window.soundManager.toggle();
                sndBtn.textContent = isEnabled ? '🔊 Дыбыс' : '🔇 Дыбыссыз';
                sndBtn.classList.toggle('active', isEnabled);
            });
        }

        // Fullscreen toggle
        const fsBtn = document.getElementById('btn-toggle-fullscreen');
        if (fsBtn) {
            fsBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                    fsBtn.textContent = '⤓ Кішірейту';
                } else {
                    document.exitFullscreen().catch(() => {});
                    fsBtn.textContent = '⛶ Толық экран';
                }
            });
        }

        // Teacher button
        const teacherBtn = document.getElementById('btn-teacher-mode');
        if (teacherBtn) {
            teacherBtn.addEventListener('click', () => {
                const pin = prompt("Оқытушы режиміне кіру үшін PIN кодын енгізіңіз (әдепкі PIN: 2026):", "2026");
                if (pin === "2026" || pin === "1234" || pin === "") {
                    this.openTeacherModal();
                } else {
                    alert("Қате PIN код!");
                }
            });
        }

        // Teacher modal buttons
        document.getElementById('teacher-save-btn')?.addEventListener('click', () => this.saveTeacherChanges());
        document.getElementById('teacher-reset-all-btn')?.addEventListener('click', () => this.resetAllGames());
        document.getElementById('teacher-close-btn')?.addEventListener('click', () => {
            document.getElementById('teacher-modal').classList.remove('active');
        });

        // Navigation Menu Cards
        document.querySelectorAll('.game-mode-card').forEach(card => {
            card.addEventListener('click', () => {
                const mode = card.dataset.mode;
                this.showView(mode);
            });
        });

        // Back to Menu buttons
        document.querySelectorAll('.btn-back-menu').forEach(btn => {
            btn.addEventListener('click', () => this.showView('menu'));
        });

        // Grand Final Button
        document.querySelectorAll('.btn-grand-final').forEach(btn => {
            btn.addEventListener('click', () => this.showView('final'));
        });

        // Timer generic controls
        document.querySelectorAll('.btn-timer-pause').forEach(btn => {
            btn.addEventListener('click', () => this.pauseResumeTimer());
        });
        document.querySelectorAll('.btn-timer-plus10').forEach(btn => {
            btn.addEventListener('click', () => this.addTimerSeconds(10));
        });
        document.querySelectorAll('.btn-timer-reset').forEach(btn => {
            btn.addEventListener('click', () => this.startTimer(25));
        });

        // Modal Close Buttons
        document.querySelectorAll('.btn-modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            });
        });

        // Time Machine check button
        document.getElementById('tm-check-btn')?.addEventListener('click', () => this.checkTimeMachineOrder());
        document.getElementById('tm-next-btn')?.addEventListener('click', () => this.nextTimeMachineTask());
        document.getElementById('tm-prev-btn')?.addEventListener('click', () => this.prevTimeMachineTask());

        // Expedition next/prev
        document.getElementById('exp-next-site-btn')?.addEventListener('click', () => this.nextExpeditionSite());
        document.getElementById('exp-prev-site-btn')?.addEventListener('click', () => this.prevExpeditionSite());

        // Court next/prev
        document.getElementById('court-next-btn')?.addEventListener('click', () => this.nextCourtCase());
        document.getElementById('court-prev-btn')?.addEventListener('click', () => this.prevCourtCase());

        // Strategy next/prev
        document.getElementById('strat-next-btn')?.addEventListener('click', () => this.nextStrategy());
        document.getElementById('strat-prev-btn')?.addEventListener('click', () => this.prevStrategy());

        // Print report
        document.getElementById('btn-print-certificate')?.addEventListener('click', () => window.print());
    }
}

// Global App Instance Initialization
window.addEventListener('DOMContentLoaded', () => {
    window.app = new HistoryArenaApp();
});
