'use strict';
// 1-2. 氣泡字典資料庫、十步驟課程劇本 (純資料)
// 注意：所有 js/ 檔案共用同一個全域範圍，必須依 index.html 中的順序載入。

        // ==========================================
        // 1. 高中生氣泡字典資料庫
        // ==========================================
        const VOCAB_DICT = {
            "電子共振": "碳氧雙鍵（C=O）的電子會分一半給旁邊的碳氮單鍵（C-N），讓 C-N 變成「1.5 鍵」，像被膠水黏住一樣無法旋轉。",
            "二面角": "兩片平面的夾角。把一條化學鍵當作門軸，左右兩片原子平面張開的角度（-180° 到 +180°）就是二面角。",
            "順式/反式": "反式（trans, ω=180°）代表兩側大原子一上一下錯開；順式（cis, ω=0°）代表擠在同一側，極易撞車。",
            "凡得瓦半徑": "每顆原子自帶的「安全社交距離半徑」。兩顆未鍵結原子的距離若小於半徑總和，電子雲就會互相排斥撞開。",
            "立體阻礙": "白話就是「空間太擠、原子撞車」。因為原子有實體體積，硬轉到某些角度會讓兩顆原子擠進同一個空間。",
            "二級結構": "蛋白質主鏈靠「氫鍵」規則捲曲或折疊出的局部立體形狀，最常見的就是彈簧狀的 α-螺旋與摺扇狀的 β-摺疊。",
            "氫鍵": "帶微正電的氫原子（N-H）與帶微負電的氧原子（C=O）之間的靜電吸引力，像微小的魔鬼氈把蛋白質固定成形。"
        };

        const VOCAB_DICT_EN = {
            "電子共振": { title: "Electron Resonance", desc: "Electrons from C=O delocalize into the adjacent C–N bond, giving it ~1.5-bond character that locks the peptide plane flat and rigid." },
            "二面角": { title: "Dihedral Angle", desc: "The torsion angle (−180° to +180°) between two planes joined along a central bond acting like a door hinge." },
            "順式/反式": { title: "cis / trans Configuration", desc: "trans (ω = 180°) places bulky Cα atoms on opposite sides; cis (ω = 0°) crowds them on the same side, causing steric clashes." },
            "凡得瓦半徑": { title: "Van der Waals Radius", desc: "Each atom's personal space radius. When two non-bonded atoms get closer than the sum of their radii, electron clouds strongly repel." },
            "立體阻礙": { title: "Steric Clash", desc: "Atoms have physical volume—forcing certain (φ, ψ) angles pushes two atoms into the same space." },
            "二級結構": { title: "Secondary Structure", desc: "Regular local backbone folds stabilized by hydrogen bonds, mainly spring-like α-helices and pleated β-sheets." },
            "氫鍵": { title: "Hydrogen Bond", desc: "Electrostatic attraction between a partially positive N–H hydrogen and a partially negative C=O oxygen—molecular Velcro holding folds together." }
        };

        const tooltipEl = document.getElementById('vocabTooltip');
        const ttTitle = document.getElementById('ttTitle');
        const ttDesc = document.getElementById('ttDesc');

        function bindVocabTooltips() {
            document.querySelectorAll('.vocab-term').forEach(el => {
                const key = el.getAttribute('data-term');
                const showTip = (e) => {
                    if (!VOCAB_DICT[key]) return;
                    if (isEN() && VOCAB_DICT_EN[key]) {
                        ttTitle.textContent = `📖 ${VOCAB_DICT_EN[key].title}`;
                        ttDesc.textContent = VOCAB_DICT_EN[key].desc;
                    } else {
                        ttTitle.textContent = `📖 ${key}`;
                        ttDesc.textContent = VOCAB_DICT[key];
                    }
                    tooltipEl.style.display = 'block';
                    const tipW = Math.min(310, window.innerWidth - 24);
                    const tipH = tooltipEl.offsetHeight || 110;
                    const x = Math.min(window.innerWidth - tipW - 12, Math.max(12, e.clientX - 40));
                    let y = e.clientY + 18;
                    if (y + tipH > window.innerHeight - 16) y = Math.max(12, e.clientY - tipH - 14);
                    tooltipEl.style.left = `${x}px`;
                    tooltipEl.style.top = `${y}px`;
                };
                el.addEventListener('mouseenter', showTip);
                el.addEventListener('mousemove', showTip);
                el.addEventListener('click', (e) => { e.stopPropagation(); showTip(e); });
                el.addEventListener('mouseleave', () => { tooltipEl.style.display = 'none'; });
            });
        }
        document.addEventListener('pointerdown', (e) => {
            if (tooltipEl.style.display === 'block' && !e.target.closest('.vocab-term') && !tooltipEl.contains(e.target)) {
                tooltipEl.style.display = 'none';
            }
        });
        window.addEventListener('scroll', () => {
            if (tooltipEl.style.display === 'block') tooltipEl.style.display = 'none';
        }, { passive: true });

        function v(word, enLabel) {
            return `<span class="vocab-term" data-term="${word}">${enLabel || word}</span>`;
        }

        // ==========================================
        // 2. 十步驟課程劇本定義
        // ==========================================
        const STEPS_DATA = [
            {
                badge: "第 1 / 10 步：銜接高中生物",
                title: "為什麼蛋白質骨架像「串珠與硬紙板」？",
                text: `高中生物學過：兩個胺基酸脫去一分子水（H₂O）會連成「胜肽鍵」。因為${v("電子共振")}，藍色與綠色這兩片<strong>胜肽平面（硬紙板）</strong>就像被 1.5 鍵鎖死，完全不能折彎！整條蛋白質唯一能轉動的關節，只有中間黑色的 <strong>Cα 原子</strong>。`,
                action: `<span>👉 動手試試：用滑鼠左鍵拖曳 3D 畫面旋轉視角，或點擊右側按鈕體驗「胜肽鍵鎖死」原理。</span>
                         <button class="inline-demo-btn" id="demoResonanceBtn">▶ 閃爍標示鎖死的胜肽平面</button>`,
                caption: "💡 觀察重點：藍色玻璃板塊與綠色玻璃板塊各自都是剛性平面，只有中間黑球 Cα 能當作轉軸。",
                setup: { view: "single", plot: "simple", aa: "general", phi: -120, psi: 120, omega: 180, lockOmega: true, vdw: false, triple: false, questTarget: null }
            },
            {
                badge: "第 2 / 10 步：認識兩個轉角",
                title: "φ (Phi) 與 ψ (Psi) 只是兩扇門的「時鐘角度」",
                text: `既然只有 Cα 關節能轉，科學家就把左側藍軸的${v("二面角")}取名為 <strong>φ (Phi)</strong>，右側綠軸的旋轉角取名為 <strong>ψ (Psi)</strong>。這兩個角度就是拉氏圖的「橫軸 (X)」與「縱軸 (Y)」。`,
                action: `<span>👉 動手試試：點擊 3D 視窗上方工具列的<strong>「俯視 φ 軸」</strong>，鏡頭會平滑對準轉軸，讓你像看時鐘一樣觀察 3D 角度！</span>`,
                caption: "💡 觀察重點：φ 控制左邊藍軸旋轉（拉氏圖左右移動），ψ 控制右邊綠軸旋轉（拉氏圖上下移動）。",
                setup: { view: "single", plot: "simple", aa: "general", phi: -90, psi: 90, omega: 180, lockOmega: true, vdw: false, triple: false, questTarget: null }
            },
            {
                badge: "第 3 / 10 步：隱藏的第三個角度",
                title: "為什麼 ω (Omega) 角被大自然鎖在 180°？",
                text: `每片硬紙板中間其實還有一個 <strong>ω 角</strong>，代表${v("順式/反式")}狀態。大自然把它死死鎖在 <strong>180°（反式 trans）</strong>，讓相鄰的 Cα 一上一下錯開。如果硬轉成 0°（順式 cis），兩邊的球就會直接撞在一起！`,
                action: `<span>👉 動手試試：取消勾選右側的「鎖定 ω = 180°」，把 ω 滑桿拉向 0°，觀察上方「最近原子距離尺」如何急速縮小！</span>`,
                caption: "💡 觀察重點：因為 ω 固定在 180°，科學家才能只用 φ 和 ψ 兩個變數畫出二維拉氏圖。",
                setup: { view: "single", plot: "simple", aa: "general", phi: -120, psi: 120, omega: 180, lockOmega: false, vdw: false, triple: false, questTarget: null }
            },
            {
                badge: "第 4 / 10 步：原子撞車現場",
                title: "為什麼拉氏圖上「大部分都是白色的」？",
                text: `原子不是沒有厚度的幾何點，而是有實體體積的胖球（${v("凡得瓦半徑")}）。當我們把 (φ, ψ) 轉到 <strong>(0°, 0°)</strong> 時，左右兩邊的氧原子 (O) 與氫原子 (H) 距離會小於 2.40 Å，發生嚴重的${v("立體阻礙")}。`,
                action: `<span>👉 系統已開啟「真實體積球 (VDW)」並設為 (0°, 0°)！看上方距離尺與 3D 紅光警示球，找出是哪兩顆原子撞在一起。</span>`,
                caption: "⚠️ 撞車警告：拉氏圖的白色區域代表物理上原子會重疊撞毀，自然界中幾乎不可能出現這些角度！",
                setup: { view: "single", plot: "simple", aa: "general", phi: 0, psi: 0, omega: 180, lockOmega: true, vdw: true, triple: false, questTarget: null }
            },
            {
                badge: "第 5 / 10 步：課本裡的二級結構",
                title: "色塊＝頭髮與蠶絲形狀的「身分證」",
                text: `既然大部分角度都會撞車，蛋白質只能待在少數「不撞車、又能連起${v("氫鍵")}」的彩色安全區（${v("二級結構")}）。紅點落在<strong>左下角</strong>就是像彈簧的<strong>右手 α-螺旋（如頭髮角蛋白）</strong>；落在<strong>左上角</strong>就是拉直的<strong>β-摺疊（如蠶絲蛋白）</strong>。`,
                action: `<span>👉 動手試試：點擊右下角的「右手 α-螺旋」與「反平行 β-摺疊」按鈕，看紅點在兩個安全區之間跳躍。</span>`,
                caption: "✅ 安全區確認：左下角是右手 α-螺旋 (-57°, -47°)，左上角是反平行 β-摺疊 (-139°, +135°)。",
                setup: { view: "single", plot: "simple", aa: "general", phi: -57, psi: -47, omega: 180, lockOmega: true, vdw: false, triple: false, questTarget: null }
            },
            {
                badge: "第 6 / 10 步：進化到真實論文圖表",
                title: "為什麼真實科學論文的拉氏圖是「水滴島嶼狀」？",
                text: `方塊只是入門簡化版。真實結構生物學家統計數萬個蛋白質後，畫出了能量等高線：<strong>深藍內圈 (Favored)</strong> 原子距離最舒適；<strong>淺藍外圈 (Allowed)</strong> 稍微擁擠但合理。`,
                action: `<span>👉 系統已切換為「真實等高線模式」！觀察左上方的 β 大島其實細分為反平行 β、平行 β 與膠原蛋白三座山峰。</span>`,
                caption: "📊 真實數據視角：自然界中超過 98% 的胺基酸都會精準落在深藍色的 Favored 核心等高線內。",
                setup: { view: "single", plot: "pro", aa: "general", phi: -139, psi: 135, omega: 180, lockOmega: true, vdw: false, triple: false, questTarget: null }
            },
            {
                badge: "第 7 / 10 步：特例一（最靈活的體操選手）",
                title: "甘胺酸 (Glycine)：沒有側鏈包袱的轉彎高手",
                text: `一般胺基酸的 Cα 上面都有一顆橘色的側鏈 (R基) 佔空間，容易跟鄰居撞車。但<strong>甘胺酸</strong>的側鏈只有一顆極小的白球（氫原子），左右完全對稱，連一般胺基酸轉不過去的「右上角」它都能輕鬆待著！`,
                action: `<span>👉 觀察拉氏圖：切換成甘胺酸後，圖上立刻出現四個對稱的藍色大島，安全面積暴增！</span>`,
                caption: "🤸 甘胺酸特性：常出現在蛋白質需要「急轉彎（Turn）」的地方，幫整條鏈做高難度折角。",
                setup: { view: "single", plot: "pro", aa: "glycine", phi: 68, psi: 35, omega: 180, lockOmega: true, vdw: false, triple: false, questTarget: null }
            },
            {
                badge: "第 8 / 10 步：特例二（最僵硬的螺旋終結者）",
                title: "脯胺酸 (Proline)：被五元環鎖死的關節",
                text: `跟甘胺酸完全相反！<strong>脯胺酸</strong>的金色側鏈自己繞了一圈，跟左側的藍色氮原子連成一個死環。這導致左側的 <strong>φ 角被死死卡在 -60° 附近</strong>完全不能轉，安全區瞬間縮成一條垂直窄帶。`,
                action: `<span>👉 試著左右拖動「φ 角」滑桿：只要稍微偏離 -60°，上方距離尺就會立刻發出撞車警報！</span>`,
                caption: "🔒 脯胺酸特性：因為轉不動，它常扮演「螺旋終結者」，強迫 α-螺旋在這裡中斷轉彎。",
                setup: { view: "single", plot: "pro", aa: "proline", phi: -60, psi: 145, omega: 180, lockOmega: true, vdw: false, triple: false, questTarget: null }
            },
            {
                badge: "第 9 / 10 步：從微觀角度到巨觀蛋白質與疾病",
                title: "多肽鏈折疊、膠原蛋白三股螺旋，與蛋白質疾病",
                text: `左側 3D 視窗已切換為<strong>「多肽鏈折疊模型」</strong>。當連續 12 個胺基酸採用 (-75°, +145°) 並由三條鏈纏繞時，就會靠紫色跨鏈${v("氫鍵")}扣成強韌的<strong>膠原蛋白三股超螺旋</strong>（皮膚與肌腱的主成分）。`,
                action: `<span>👉 動手試試：切換「膠原蛋白三股超螺旋」開關，或點擊右下角「疾病演示」看健康螺旋如何變性成異常斑塊！</span>`,
                caption: "🧬 宏觀結構湧現：微觀的 (φ, ψ) 角度重複出現，就決定了巨觀的蛋白質形狀與生理功能！",
                setup: { view: "chain", plot: "pro", aa: "proline", phi: -75, psi: 145, omega: 180, lockOmega: true, vdw: false, triple: true, questTarget: null }
            },
            {
                badge: "第 10 / 10 步：畢業三階段實戰闖關",
                title: "自我檢核：不靠別人，測試你是否完全看懂拉氏圖！",
                text: `完成以下三個真實情境小任務，即可掌握拉氏圖的全部核心判讀能力：`,
                action: `<span>🎯 請依照下方紫框中的任務提示操作拉氏圖或右側控制面板：</span>`,
                caption: "🏆 畢業測驗進行中：結合拉氏圖等高線、3D 多肽鏈形狀與側鏈特性來破關吧！",
                setup: { view: "chain", plot: "pro", aa: "general", phi: -140, psi: 135, omega: 180, lockOmega: true, vdw: false, triple: false, questTarget: { phi: -57, psi: -47, name: "神秘結構 A" } }
            }
        ];

        const STEPS_DATA_EN = [
            {
                badge: "Step 1 / 10: Peptide Bond Basics",
                title: "Why is a protein backbone like rigid plates on hinges?",
                text: `Two amino acids condense into a peptide bond. Because of ${v("電子共振", "electron resonance")}, the blue and green <strong>peptide planes</strong> have partial double-bond (1.5-bond) character and stay completely flat! The only rotatable swivel joint is the central dark <strong>Cα atom</strong>.`,
                action: `<span>👉 Try it: Drag the 3D view to rotate, or click the button to highlight the locked peptide planes.</span>
                         <button class="inline-demo-btn" id="demoResonanceBtn">▶ Pulse Rigid Peptide Planes</button>`,
                caption: "💡 Key insight: Both the blue and green glass plates are rigid planes—only Cα in the middle can rotate."
            },
            {
                badge: "Step 2 / 10: Two Torsion Angles",
                title: "φ (Phi) and ψ (Psi) are simply two clock angles",
                text: `Since only Cα bonds can spin, structural biologists name the left blue-axis ${v("二面角", "dihedral angle")} <strong>φ (Phi)</strong> and the right green-axis angle <strong>ψ (Psi)</strong>. These two angles form the X and Y axes of the Ramachandran plot.`,
                action: `<span>👉 Try it: Click <strong>"Look down φ"</strong> in the 3D toolbar to align the camera along the N–Cα axis like a Newman projection!</span>`,
                caption: "💡 Key insight: φ rotates the left blue axis (horizontal on plot); ψ rotates the right green axis (vertical on plot)."
            },
            {
                badge: "Step 3 / 10: The Hidden Third Angle",
                title: "Why does nature lock ω (Omega) at 180°?",
                text: `Inside each peptide plane lies a third dihedral angle <strong>ω</strong> (${v("順式/反式", "cis / trans")}). Nature locks it at <strong>180° (trans)</strong> so neighboring Cα atoms alternate cleanly. Forcing it to 0° (cis) slams the atoms together!`,
                action: `<span>👉 Try it: Uncheck "Lock ω = 180°" on the right and drag the ω slider toward 0° while watching the closest-atom distance HUD shrink!</span>`,
                caption: "💡 Key insight: Because ω is fixed at 180°, a 2D (φ, ψ) Ramachandran plot captures almost the entire backbone conformation."
            },
            {
                badge: "Step 4 / 10: Atomic Steric Clash",
                title: "Why is most of the Ramachandran plot empty white space?",
                text: `Atoms aren't dimensionless points—they have physical volume (${v("凡得瓦半徑", "Van der Waals radius")}). At <strong>(0°, 0°)</strong>, oxygen (O) and hydrogen (H) come closer than 2.40 Å, triggering severe ${v("立體阻礙", "steric clash")}.`,
                action: `<span>👉 VDW space-filling spheres are ON at (0°, 0°)! Inspect the red pulsing clash spheres and distance HUD to see which atoms collide.</span>`,
                caption: "⚠️ Clash warning: White zones are physically forbidden because electron clouds overlap—almost never observed in nature."
            },
            {
                badge: "Step 5 / 10: Textbook Secondary Structures",
                title: "Colored islands = conformational fingerprints of hair & silk",
                text: `Proteins settle into the few clash-free zones that also form regular ${v("氫鍵", "hydrogen bonds")} (${v("二級結構", "secondary structures")}). The <strong>bottom-left</strong> is the spring-like <strong>right-handed α-helix (hair keratin)</strong>; the <strong>top-left</strong> is the extended <strong>β-sheet (silk fibroin)</strong>.`,
                action: `<span>👉 Try it: Click "Right-handed α-Helix" and "Antiparallel β-Sheet" presets to watch the red dot jump between islands.</span>`,
                caption: "✅ Safe zones: Bottom-left = Right α-helix (−57°, −47°); Top-left = Antiparallel β-sheet (−139°, +135°)."
            },
            {
                badge: "Step 6 / 10: Real Research Contours",
                title: "Why do real papers show smooth island contours?",
                text: `Boxes are a beginner simplification. Real structural biologists survey thousands of crystal structures to map density contours: <strong>dark blue (Favored)</strong> is optimal; <strong>light blue (Allowed)</strong> is tighter but feasible.`,
                action: `<span>👉 Switched to KDE Contours! Notice how the upper-left β basin splits into antiparallel β, parallel β, and collagen/PPII peaks.</span>`,
                caption: "📊 Real data perspective: Over 98% of residues in high-resolution structures fall inside the dark-blue Favored core."
            },
            {
                badge: "Step 7 / 10: Special Case 1 (The Gymnast)",
                title: "Glycine: No side chain, maximum flexibility",
                text: `Typical residues carry a bulky Cβ side chain that limits rotation. <strong>Glycine</strong> only has a tiny hydrogen atom—completely symmetric—unlocking the right half of the plot where normal residues clash!`,
                action: `<span>👉 Observe the plot: Switching to Glycine reveals four symmetric blue islands with vastly expanded allowed area!</span>`,
                caption: "🤸 Glycine role: Frequently found in tight protein turns where sharp backbone bends are essential."
            },
            {
                badge: "Step 8 / 10: Special Case 2 (The Helix Breaker)",
                title: "Proline: Locked by a 5-membered ring",
                text: `The opposite of Glycine! <strong>Proline</strong>'s side chain loops back onto backbone N, forming a rigid 5-membered ring that locks <strong>φ near −60°</strong> and compresses the allowed region into a narrow vertical band.`,
                action: `<span>👉 Drag the φ slider away from −60° and watch the steric clash warning trigger immediately!</span>`,
                caption: "🔒 Proline role: Because φ cannot rotate freely, Proline often acts as an α-helix breaker."
            },
            {
                badge: "Step 9 / 10: From Local Angles to Collagen & Disease",
                title: "Polypeptide folding, collagen triple helix & misfolding",
                text: `The 3D view is now in <strong>Polypeptide Chain mode</strong>. Repeating (−75°, +145°) across 3 intertwined chains forms inter-chain ${v("氫鍵", "hydrogen bonds")} and builds the tough <strong>collagen triple helix</strong> (skin & tendons).`,
                action: `<span>👉 Try toggling "Collagen Triple Helix" or click "Misfolding Demo" to see an α-helix unravel into β-sheet amyloid plaques!</span>`,
                caption: "🧬 Emergent architecture: Repeating local (φ, ψ) angles dictates macroscopic protein shape and biological function."
            },
            {
                badge: "Step 10 / 10: Final 3-Stage Challenge",
                title: "Self-Check: Can you read a Ramachandran plot on your own?",
                text: `Complete these three hands-on challenges to verify your mastery of Ramachandran analysis:`,
                action: `<span>🎯 Follow the purple mission box below by dragging on the plot or adjusting controls on the right:</span>`,
                caption: "🏆 Final quiz active: Combine contours, 3D chain shape, and side-chain chemistry to clear all 3 stages!"
            }
        ];

        function getStepData(idx) {
            const base = STEPS_DATA[idx];
            if (!base) return null;
            if (isEN() && STEPS_DATA_EN[idx]) {
                return Object.assign({}, base, STEPS_DATA_EN[idx]);
            }
            return base;
        }

