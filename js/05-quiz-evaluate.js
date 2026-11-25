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

            const en = isEN();
            const s1Class = quizStage === 1 ? 'current' : (quizStage > 1 ? 'cleared' : '');
            const s2Class = quizStage === 2 ? 'current' : (quizStage > 2 ? 'cleared' : '');
            const s3Class = quizStage === 3 ? 'current' : (quizStage > 3 ? 'cleared' : '');

            let bodyHTML = '';
            if (quizStage === 1) {
                if (!stage1DotReached) {
                    bodyHTML = en
                        ? `<div><strong>Stage 1 (Identify the Fold):</strong> Drag the red dot on the plot into the purple target (bottom-left) and observe what shape the 3D polypeptide chain forms!</div>`
                        : `<div><strong>第一關（看形狀判讀結構）：</strong>請在拉氏圖上拖曳紅點進入紫色的「神秘靶心」（左下角區域），觀察左側 3D 多肽鏈長成什麼形狀！</div>`;
                } else {
                    bodyHTML = en ? `
                        <div><strong>✅ Target reached!</strong> Look at the coiled 3D polypeptide chain—which secondary structure is it?</div>
                        <div class="quiz-choices">
                            <button class="quiz-choice-btn" id="q1AlphaBtn">Spring-like "Right-handed α-Helix" (e.g. hair keratin)</button>
                            <button class="quiz-choice-btn" id="q1BetaBtn">Pleated "Antiparallel β-Sheet" (e.g. silk fibroin)</button>
                        </div>
                    ` : `
                        <div><strong>✅ 已抵達神秘靶心！</strong>觀察左側 3D 畫面中多肽鏈捲曲的樣子，請問它是哪一種二級結構？</div>
                        <div class="quiz-choices">
                            <button class="quiz-choice-btn" id="q1AlphaBtn">彈簧狀的「右手 α-螺旋」（如頭髮角蛋白）</button>
                            <button class="quiz-choice-btn" id="q1BetaBtn">鋸齒摺扇狀的「反平行 β-摺疊」（如蠶絲蛋白）</button>
                        </div>
                    `;
                }
            } else if (quizStage === 2) {
                if (currentAA === 'glycine' && Math.abs(wrapDiff(currentPhi, 62)) <= 15 && Math.abs(wrapDiff(currentPsi, 40)) <= 15) {
                    bodyHTML = en ? `
                        <div><strong>🎉 Rescue succeeded!</strong> Glycine's tiny hydrogen side chain eliminates the steric clash in this tight turn!</div>
                        <div class="quiz-choices">
                            <button class="quiz-choice-btn" id="q2NextBtn">Proceed to Final Stage (Stage 3) →</button>
                        </div>
                    ` : `
                        <div><strong>🎉 急診室搶救成功！</strong>因為甘胺酸（Glycine）側鏈只有一顆最小的氫原子，完全消除了立體阻礙！</div>
                        <div class="quiz-choices">
                            <button class="quiz-choice-btn" id="q2NextBtn">進入最後一關（第三關）→</button>
                        </div>
                    `;
                } else {
                    bodyHTML = en
                        ? `<div><strong>Stage 2 (Protein ER):</strong> A steric clash just occurred at (+62°, +40°)! <strong>Without changing the angles</strong>, switch the Amino Acid selector on the right to the residue best suited for tight turns!</div>`
                        : `<div><strong>第二關（蛋白質急診室）：</strong>現在蛋白質在急轉彎處 (+62°, +40°) 發生嚴重撞車警報！<strong>請不要改角度</strong>，直接在右側「胺基酸側鏈類型」下拉選單中，幫它換成最適合急轉彎的胺基酸！</div>`;
                }
            } else if (quizStage === 3) {
                bodyHTML = en
                    ? `<div><strong>Stage 3 (Collagen Assembler):</strong> The three chains are currently loose. Drag the red dot into the upper-left target (hint: φ ≈ −75°, ψ ≈ +145°) to twist them into a collagen triple helix with inter-chain H-bonds!</div>`
                    : `<div><strong>第三關（膠原蛋白組裝師）：</strong>目前三條多肽鏈正處於鬆散狀態。請拖動拉氏圖紅點進入左上方的「膠原蛋白三股超螺旋靶心」（提示：φ 約 -75°, ψ 約 +145°），讓三條鏈緊密纏繞並連出紫色跨鏈氫鍵！</div>`;
            } else {
                bodyHTML = en
                    ? `<div><strong>🏆 All 3 Stages Cleared!</strong> You've mastered peptide plane rigidity, torsion angles, steric clashes, special amino acids, and collagen triple-helix assembly!</div>`
                    : `<div><strong>🏆 恭喜全部三關通關！</strong>你已經完全掌握「胜肽平面剛性、二面角旋轉、凡得瓦碰撞、特殊胺基酸與多肽鏈三股組裝」的完整結構生物學邏輯！</div>`;
            }

            quizContainer.innerHTML = `
                <div class="quiz-panel">
                    <div class="quiz-stage-bar">
                        <span class="q-stage-tag ${s1Class}">${en ? 'Stage 1: Identify Fold' : '第一關：看形狀猜結構'} ${quizStage > 1 ? '✓' : ''}</span>
                        <span class="q-stage-tag ${s2Class}">${en ? 'Stage 2: Clash Rescue' : '第二關：急診室救撞車'} ${quizStage > 2 ? '✓' : ''}</span>
                        <span class="q-stage-tag ${s3Class}">${en ? 'Stage 3: Collagen Build' : '第三關：膠原蛋白組裝'} ${quizStage > 3 ? '✓' : ''}</span>
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
            const en = isEN();
            if (omega < 150 && !(aaType === 'proline' && omega < 25)) {
                return {
                    status: 'clash',
                    title: en ? `⛔ Peptide Plane Distortion (ω = ${omega}°)` : `⛔ 胜肽鍵平面扭曲警告 (ω = ${omega}°)`,
                    desc: en
                        ? 'The peptide bond has partial double-bond (1.5) resonance; twisting ω breaks planarity and causes severe Cα steric clashes!'
                        : '胜肽鍵具有 1.5 鍵共振特性，強行扭轉 ω 角會破壞平面剛性並導致兩端 Cα 嚴重碰撞！'
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
                        title: en ? `🎉 Target Hit!` : `🎉 精準命中「${questTarget.name}」目標靶心！`,
                        desc: en
                            ? `Angle error is only (${dPhi}°, ${dPsi}°). Check the mission box above for the next step.`
                            : `目前角度誤差僅 (${dPhi}°, ${dPsi}°)，請查看上方任務框的下一步指示。`
                    };
                }
            }

            const density = computeDensity(phi, psi, aaType);
            const tFavored = getFavoredThreshold(aaType);
            const tAllowed = 0.11;

            let structName = '';
            let plainExplain = '';

            if (isCollagenRegion(phi, psi)) {
                structName = en ? 'Collagen / PPII Left-Handed Helix' : '膠原蛋白 / PPII 左手螺旋區';
                plainExplain = showTripleHelix
                    ? (en ? 'Three NeRF-built left-handed PPII chains intertwine into a right-handed superhelix locked by inter-chain H-bonds.' : '三條 NeRF 計算的左手 PPII 鏈正相互纏繞成右手超螺旋，並透過紫色跨鏈氫鍵鎖定（皮膚與肌腱的主成分）！')
                    : (en ? 'Single PPII chain (3.0 residues/turn, no intra-chain H-bonds). Toggle "Collagen Triple Helix" to see 3 chains intertwine!' : '單條 PPII 鏈為每圈 3.0 殘基的左手螺旋（無鏈內氫鍵）；開啟右側「膠原蛋白三股超螺旋」開關可看三條鏈如何纏繞！');
            } else if (aaType === 'prepro' && phi >= -165 && phi <= -100 && psi >= 45 && psi <= 105) {
                structName = en ? 'Pre-Proline Unique ζ (Zeta) Region' : 'Pre-Proline 特有 ζ (Zeta) 區';
                plainExplain = en
                    ? 'When the next residue is Proline, its pyrrolidine ring stabilizes this unique ζ conformation.'
                    : '下一個殘基是脯胺酸時，五元環與前一位主鏈產生特殊空間效應，使此區域反而成為穩定安全區。';
            } else if (aaType === 'general' || aaType === 'ileval' || aaType === 'prepro') {
                if (phi >= -165 && phi <= -125 && psi >= 125 && psi <= 175) {
                    structName = en ? 'Antiparallel β-Sheet (Silk Fibroin)' : '反平行 β-摺疊（如蠶絲蛋白）';
                    plainExplain = aaType === 'ileval'
                        ? (en ? 'β-branched residues (Val/Ile) have minimal steric crowding in extended β-sheets—their preferred conformation!' : 'β-分支胺基酸（Val/Ile）在伸展的 β-摺疊中立體阻礙最小，是最偏好的構形！')
                        : (en ? 'Extended pleated backbone ideal for antiparallel H-bonded sheets with high tensile strength.' : '骨架伸展成平整鋸齒狀，適合兩條反向平行的蛋白質鏈並排形成氫鍵，抗拉力極強。');
                } else if (phi >= -130 && phi <= -95 && psi >= 95 && psi <= 135) {
                    structName = en ? 'Parallel β-Sheet' : '平行 β-摺疊 (Parallel β-sheet)';
                    plainExplain = en ? 'Extended conformation suited for parallel H-bonded β-strands.' : '骨架伸展，適合兩條同方向的蛋白質鏈並排組成片狀結構。';
                } else if (phi >= -80 && phi <= -45 && psi >= -60 && psi <= -32) {
                    structName = en ? 'Right-Handed α-Helix (Hair Keratin)' : '右手 α-螺旋（如頭髮角蛋白）';
                    plainExplain = aaType === 'ileval'
                        ? (en ? 'β-branched side chains crowd the α-helix backbone, narrowing the favored α core.' : 'β-分支側鏈在 α-螺旋中較擁擠，因此核心安全區比一般胺基酸更窄。')
                        : (en ? 'Nature’s most stable single-chain helix (3.6 residues/turn) stabilized by i→i+4 intra-chain H-bonds.' : '自然界最穩定的單股螺旋彈簧結構，每圈 3.6 個胺基酸，主鏈內部會自動連起穩固的氫鍵。');
                } else if (phi >= -95 && phi <= -45 && psi >= -31 && psi <= -5) {
                    structName = en ? '3₁₀-Helix / Bridge Region' : '3₁₀-螺旋 / 橋接區';
                    plainExplain = en ? 'Tighter helical turn commonly found at the N- or C-caps of α-helices.' : '比 α-螺旋更緊湊的螺旋構形，常見於螺旋的頭尾兩端。';
                } else if (phi >= 40 && phi <= 75 && psi >= 25 && psi <= 65) {
                    structName = en ? 'Left-Handed α-Helix' : '左手 α-螺旋 (Left-handed α-helix)';
                    plainExplain = en ? 'Rare inverted helical conformation typically seen in tight turns.' : '罕見的反向螺旋，通常只有特定轉角才會出現。';
                }
            }

            if (density >= tFavored) {
                return {
                    status: 'safe',
                    title: (en ? '✅ Favored Core' : '✅ 最有利核心區 (Favored)') + (structName ? ' — ' + structName : ''),
                    desc: plainExplain || (en ? 'Optimal interatomic spacing with zero clashes; >98% of natural residues reside here.' : '原子之間保持最舒適的黃金距離，自然界超過 98% 的胺基酸都落在這個深藍區內。')
                };
            }
            if (density >= tAllowed) {
                return {
                    status: 'allowed',
                    title: (en ? '⚠️ Allowed Region' : '⚠️ 額外容許區 (Allowed)') + (structName ? ' — ' + structName : ''),
                    desc: plainExplain || (en ? 'Slightly tighter atomic contacts, but still physically accessible.' : '原子稍微靠近了一點（有點擠），但在物理上仍轉得過去。')
                };
            }

            if (aaType === 'proline') {
                return {
                    status: 'clash',
                    title: en ? '⛔ Outlier — Proline 5-Membered Ring Lock' : '⛔ 嚴重禁區 (Outlier) — 脯胺酸五元環鎖死',
                    desc: en ? 'Proline’s cyclic side chain is covalently bonded to backbone N, physically preventing this φ angle!' : '脯胺酸的金色側鏈直接黏死了左側氮原子，物理上根本無法轉到這個 φ 角度！'
                };
            }
            return {
                status: 'clash',
                title: en ? '⛔ Steric Clash Zone (Outlier)' : '⛔ 立體阻礙禁區 (Outlier) — 原子發生碰撞！',
                desc: en ? 'Non-bonded atoms are closer than their Van der Waals radii—electron clouds overlap.' : '兩邊的原子距離小於凡得瓦安全半徑、電子雲重疊撞在一起了，自然界中幾乎不會出現這個角度。'
            };
        }

