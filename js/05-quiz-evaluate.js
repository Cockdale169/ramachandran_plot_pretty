'use strict';
// 6-7. 第 10 步測驗介面、區域判定與闖關檢查
// 注意：所有 js/ 檔案共用同一個全域範圍，必須依 index.html 中的順序載入。

        // ==========================================
        // 6. 第 10 步三階段互動測驗渲染與判斷
        // ==========================================
        function renderQuizUI() {
            if (currentStepIdx !== 9) {
                quizContainer.innerHTML = '';
                return;
            }

            const s1Class = quizStage === 1 ? 'current' : (quizStage > 1 ? 'cleared' : '');
            const s2Class = quizStage === 2 ? 'current' : (quizStage > 2 ? 'cleared' : '');
            const s3Class = quizStage === 3 ? 'current' : (quizStage > 3 ? 'cleared' : '');

            let bodyHTML = '';
            if (quizStage === 1) {
                if (!stage1DotReached) {
                    bodyHTML = `<div><strong>第一關（看形狀判讀結構）：</strong>請在拉氏圖上拖曳紅點進入紫色的「神秘靶心」（左下角區域），觀察左側 3D 多肽鏈長成什麼形狀！</div>`;
                } else {
                    bodyHTML = `
                        <div><strong>✅ 已抵達神秘靶心！</strong>觀察左側 3D 畫面中多肽鏈捲曲的樣子，請問它是哪一種二級結構？</div>
                        <div class="quiz-choices">
                            <button class="quiz-choice-btn" id="q1AlphaBtn">彈簧狀的「右手 α-螺旋」（如頭髮角蛋白）</button>
                            <button class="quiz-choice-btn" id="q1BetaBtn">鋸齒摺扇狀的「反平行 β-摺疊」（如蠶絲蛋白）</button>
                        </div>
                    `;
                }
            } else if (quizStage === 2) {
                if (currentAA === 'glycine' && Math.abs(wrapDiff(currentPhi, 62)) <= 15 && Math.abs(wrapDiff(currentPsi, 40)) <= 15) {
                    bodyHTML = `
                        <div><strong>🎉 急診室搶救成功！</strong>因為甘胺酸（Glycine）側鏈只有一顆最小的氫原子，完全消除了立體阻礙！</div>
                        <div class="quiz-choices">
                            <button class="quiz-choice-btn" id="q2NextBtn">進入最後一關（第三關）→</button>
                        </div>
                    `;
                } else {
                    bodyHTML = `<div><strong>第二關（蛋白質急診室）：</strong>現在蛋白質在急轉彎處 (+62°, +40°) 發生嚴重撞車警報！<strong>請不要改角度</strong>，直接在右側「胺基酸側鏈類型」下拉選單中，幫它換成最適合急轉彎的胺基酸！</div>`;
                }
            } else if (quizStage === 3) {
                bodyHTML = `<div><strong>第三關（膠原蛋白組裝師）：</strong>目前三條多肽鏈正處於鬆散狀態。請拖動拉氏圖紅點進入左上方的「膠原蛋白三股超螺旋靶心」（提示：φ 約 -75°, ψ 約 +145°），讓三條鏈緊密纏繞並連出紫色跨鏈氫鍵！</div>`;
            } else {
                bodyHTML = `<div><strong>🏆 恭喜全部三關通關！</strong>你已經完全掌握「胜肽平面剛性、二面角旋轉、凡得瓦碰撞、特殊胺基酸與多肽鏈三股組裝」的完整結構生物學邏輯！</div>`;
            }

            quizContainer.innerHTML = `
                <div class="quiz-panel">
                    <div class="quiz-stage-bar">
                        <span class="q-stage-tag ${s1Class}">第一關：看形狀猜結構 ${quizStage > 1 ? '✓' : ''}</span>
                        <span class="q-stage-tag ${s2Class}">第二關：急診室救撞車 ${quizStage > 2 ? '✓' : ''}</span>
                        <span class="q-stage-tag ${s3Class}">第三關：膠原蛋白組裝 ${quizStage > 3 ? '✓' : ''}</span>
                    </div>
                    ${bodyHTML}
                </div>
            `;

            const q1AlphaBtn = document.getElementById('q1AlphaBtn');
            const q1BetaBtn = document.getElementById('q1BetaBtn');
            const q2NextBtn = document.getElementById('q2NextBtn');

            if (q1AlphaBtn) {
                q1AlphaBtn.addEventListener('click', () => {
                    quizStage = 2;
                    questTarget = null;
                    setAminoAcid('general');
                    setAngles(62, 40);
                    renderQuizUI();
                });
            }
            if (q1BetaBtn) {
                q1BetaBtn.addEventListener('click', () => {
                    let msgEl = document.getElementById('q1InlineMsg');
                    if (!msgEl) {
                        msgEl = document.createElement('div');
                        msgEl.id = 'q1InlineMsg';
                        msgEl.className = 'quiz-inline-msg';
                        quizContainer.querySelector('.quiz-panel').appendChild(msgEl);
                    }
                    msgEl.innerHTML = '💡 <strong>提示：</strong>再看仔細一點喔！左側 3D 模型現在捲成一圈一圈像彈簧一樣，且有 i 與 i+4 的紫色氫鍵，這是 <strong>α-螺旋</strong> 的特徵！';
                });
            }
            if (q2NextBtn) {
                q2NextBtn.addEventListener('click', () => {
                    quizStage = 3;
                    showTripleHelix = true;
                    tripleHelixChk.checked = true;
                    setViewMode('chain');
                    setAminoAcid('proline');
                    questTarget = { phi: -75, psi: 145, name: "膠原蛋白三股超螺旋" };
                    setAngles(-145, -40);
                    renderQuizUI();
                });
            }
        }

        // ==========================================
        // 7. 區域判定與闖關檢查
        // ==========================================
        function evaluateRegion(phi, psi, omega, aaType) {
            if (omega < 150 && !(aaType === 'proline' && omega < 25)) {
                return {
                    status: 'clash',
                    title: `⛔ 胜肽鍵平面扭曲警告 (ω = ${omega}°)`,
                    desc: '胜肽鍵具有 1.5 鍵共振特性，強行扭轉 ω 角會破壞平面剛性並導致兩端 Cα 嚴重碰撞！'
                };
            }

            if (questTarget) {
                const dPhi = Math.abs(wrapDiff(phi, questTarget.phi));
                const dPsi = Math.abs(wrapDiff(psi, questTarget.psi));
                if (dPhi <= 11 && dPsi <= 11) {
                    if (currentStepIdx === 9 && quizStage === 1) {
                        stage1DotReached = true;
                        renderQuizUI();
                    } else if (currentStepIdx === 9 && quizStage === 3) {
                        quizStage = 4;
                        renderQuizUI();
                    }
                    return {
                        status: 'quest-win',
                        title: `🎉 精準命中「${questTarget.name}」目標靶心！`,
                        desc: `目前角度誤差僅 (${dPhi}°, ${dPsi}°)，請查看上方任務框的下一步指示。`
                    };
                }
            }

            const density = computeDensity(phi, psi, aaType);
            const tFavored = getFavoredThreshold(aaType);
            const tAllowed = 0.11;

            let structName = '';
            let plainExplain = '';

            if (isCollagenRegion(phi, psi)) {
                structName = '膠原蛋白 / PPII 左手螺旋區';
                plainExplain = showTripleHelix
                    ? '三條 NeRF 計算的左手 PPII 鏈正相互纏繞成右手超螺旋，並透過紫色跨鏈氫鍵鎖定（皮膚與肌腱的主成分）！'
                    : '單條 PPII 鏈為每圈 3.0 殘基的左手螺旋（無鏈內氫鍵）；開啟右側「膠原蛋白三股超螺旋」開關可看三條鏈如何纏繞！';
            } else if (aaType === 'prepro' && phi >= -165 && phi <= -100 && psi >= 45 && psi <= 105) {
                structName = 'Pre-Proline 特有 ζ (Zeta) 區';
                plainExplain = '下一個殘基是脯胺酸時，五元環與前一位主鏈產生特殊空間效應，使此區域反而成為穩定安全區。';
            } else if (aaType === 'general' || aaType === 'ileval' || aaType === 'prepro') {
                if (phi >= -165 && phi <= -125 && psi >= 125 && psi <= 175) {
                    structName = '反平行 β-摺疊（如蠶絲蛋白）';
                    plainExplain = aaType === 'ileval'
                        ? 'β-分支胺基酸（Val/Ile）在伸展的 β-摺疊中立體阻礙最小，是最偏好的構形！'
                        : '骨架伸展成平整鋸齒狀，適合兩條反向平行的蛋白質鏈並排形成氫鍵，抗拉力極強。';
                } else if (phi >= -130 && phi <= -95 && psi >= 95 && psi <= 135) {
                    structName = '平行 β-摺疊 (Parallel β-sheet)';
                    plainExplain = '骨架伸展，適合兩條同方向的蛋白質鏈並排組成片狀結構。';
                } else if (phi >= -80 && phi <= -45 && psi >= -60 && psi <= -32) {
                    structName = '右手 α-螺旋（如頭髮角蛋白）';
                    plainExplain = aaType === 'ileval'
                        ? 'β-分支側鏈在 α-螺旋中較擁擠，因此核心安全區比一般胺基酸更窄。'
                        : '自然界最穩定的單股螺旋彈簧結構，每圈 3.6 個胺基酸，主鏈內部會自動連起穩固的氫鍵。';
                } else if (phi >= -95 && phi <= -45 && psi >= -31 && psi <= -5) {
                    structName = '3₁₀-螺旋 / 橋接區';
                    plainExplain = '比 α-螺旋更緊湊的螺旋構形，常見於螺旋的頭尾兩端。';
                } else if (phi >= 40 && phi <= 75 && psi >= 25 && psi <= 65) {
                    structName = '左手 α-螺旋 (Left-handed α-helix)';
                    plainExplain = '罕見的反向螺旋，通常只有特定轉角才會出現。';
                }
            }

            if (density >= tFavored) {
                return {
                    status: 'safe',
                    title: `✅ 最有利核心區 (Favored)${structName ? ' — ' + structName : ''}`,
                    desc: plainExplain || '原子之間保持最舒適的黃金距離，自然界超過 98% 的胺基酸都落在這個深藍區內。'
                };
            }
            if (density >= tAllowed) {
                return {
                    status: 'allowed',
                    title: `⚠️ 額外容許區 (Allowed)${structName ? ' — ' + structName : ''}`,
                    desc: plainExplain || '原子稍微靠近了一點（有點擠），但在物理上仍轉得過去。'
                };
            }

            if (aaType === 'proline') {
                return {
                    status: 'clash',
                    title: '⛔ 嚴重禁區 (Outlier) — 脯胺酸五元環鎖死',
                    desc: '脯胺酸的金色側鏈直接黏死了左側氮原子，物理上根本無法轉到這個 φ 角度！'
                };
            }
            return {
                status: 'clash',
                title: '⛔ 立體阻礙禁區 (Outlier) — 原子發生碰撞！',
                desc: '兩邊的原子距離小於凡得瓦安全半徑、電子雲重疊撞在一起了，自然界中幾乎不會出現這個角度。'
            };
        }

