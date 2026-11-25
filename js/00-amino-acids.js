'use strict';
// 0. 20 種標準胺基酸資料庫：名稱、分類、拉氏圖類別、側鏈內部座標 (NeRF 建構用)
// 注意：所有 js/ 檔案共用同一個全域範圍，必須依 index.html 中的順序載入。
//
// 側鏈原子格式：[原子名, 元素, 參考a, 參考b, 參考c(鍵結的父原子), 鍵長Å, 鍵角(b-c-新)°, 二面角(a-b-c-新)°]
// 參考原子可用 'N'、'CA'、'CB' 或先前已建立的側鏈原子。
// 幾何數值取自標準殘基幾何 (Engh & Huber 鍵長鍵角) 與最常見旋轉異構物 (rotamer) 的 χ 角。
// ring: 需要額外補上的閉環鍵。

const RAMA_CLASS_INFO = {
    general: { zh: '一般類別 (General)', en: 'General' },
    glycine: { zh: '甘胺酸類別 (Gly)', en: 'Glycine' },
    proline: { zh: '脯胺酸類別 (Pro)', en: 'trans-Pro' },
    ileval: { zh: 'β-分支類別 (Ile/Val)', en: 'Ile/Val' },
    prepro: { zh: '脯胺酸前一位 (Pre-Pro)', en: 'Pre-Pro' }
};

const AA_GROUP_INFO = {
    special: { zh: '特殊', en: 'Special', color: '#af52de' },
    nonpolar: { zh: '非極性．疏水', en: 'Nonpolar', color: '#ff9500' },
    polar: { zh: '極性．不帶電', en: 'Polar', color: '#34c759' },
    acidic: { zh: '酸性．帶負電', en: 'Acidic', color: '#ff3b30' },
    basic: { zh: '鹼性．帶正電', en: 'Basic', color: '#0071e3' }
};

const PHE_RING = [
    ['CG', 'C', 'N', 'CA', 'CB', 1.50, 114.0, -64.7],
    ['CD1', 'C', 'CA', 'CB', 'CG', 1.39, 120.0, 93.3],
    ['CD2', 'C', 'CA', 'CB', 'CG', 1.39, 120.0, -86.7],
    ['CE1', 'C', 'CB', 'CG', 'CD1', 1.39, 120.0, 180],
    ['CE2', 'C', 'CB', 'CG', 'CD2', 1.39, 120.0, 180],
    ['CZ', 'C', 'CG', 'CD1', 'CE1', 1.39, 120.0, 0]
];

const AMINO_ACIDS = {
    GLY: {
        one: 'G', zh: '甘胺酸', en: 'Glycine', group: 'special', cls: 'glycine', atoms: [], ring: [],
        note: '側鏈只有一顆氫原子，沒有 Cβ，左右對稱，是唯一能自由進入右半邊拉氏圖的胺基酸，常負責急轉彎。'
    },
    PRO: {
        one: 'P', zh: '脯胺酸', en: 'Proline', group: 'special', cls: 'proline',
        atoms: [
            ['CG', 'C', 'N', 'CA', 'CB', 1.50, 104.5, 29.6],
            ['CD', 'C', 'CA', 'CB', 'CG', 1.51, 105.5, -34.8]
        ],
        ring: [['CD', 'N']],
        note: '側鏈繞回來接上主鏈氮原子形成五元環，φ 被鎖在 -63° 附近；常打斷 α-螺旋，是「螺旋終結者」。'
    },
    PREPRO: {
        one: 'X', zh: '脯胺酸前一位殘基', en: 'Pre-Proline', group: 'special', cls: 'prepro', atoms: [], ring: [],
        note: '這不是一種胺基酸，而是「下一個殘基是脯胺酸」的情境。脯胺酸環會推擠前一個殘基，α 區縮小、左手 α 區幾乎消失，並出現獨特的 ζ 區 (-140°, +80°)。3D 以丙胺酸側鏈示意。'
    },
    ALA: {
        one: 'A', zh: '丙胺酸', en: 'Alanine', group: 'nonpolar', cls: 'general', atoms: [], ring: [],
        note: '側鏈只是一個甲基 (-CH₃)，體積小又不帶電，是最強的 α-螺旋形成者，也是「一般胺基酸」拉氏圖的代表。'
    },
    VAL: {
        one: 'V', zh: '纈胺酸', en: 'Valine', group: 'nonpolar', cls: 'ileval',
        atoms: [
            ['CG1', 'C', 'N', 'CA', 'CB', 1.527, 110.7, 177.2],
            ['CG2', 'C', 'N', 'CA', 'CB', 1.527, 110.4, -63.3]
        ],
        ring: [],
        note: 'β-分支胺基酸：Cβ 上同時接兩個碳，在 α-螺旋裡會和主鏈擠在一起，因此強烈偏好伸展的 β-摺疊。'
    },
    LEU: {
        one: 'L', zh: '白胺酸', en: 'Leucine', group: 'nonpolar', cls: 'general',
        atoms: [
            ['CG', 'C', 'N', 'CA', 'CB', 1.53, 116.1, -60.1],
            ['CD1', 'C', 'CA', 'CB', 'CG', 1.524, 110.3, 174.9],
            ['CD2', 'C', 'CA', 'CB', 'CG', 1.525, 110.6, 66.7]
        ],
        ring: [],
        note: '分支點在 Cγ（比纈胺酸遠一格），不會卡住主鏈，因此是強 α-螺旋形成者，也是疏水核心的主力。'
    },
    ILE: {
        one: 'I', zh: '異白胺酸', en: 'Isoleucine', group: 'nonpolar', cls: 'ileval',
        atoms: [
            ['CG1', 'C', 'N', 'CA', 'CB', 1.527, 110.7, 59.7],
            ['CG2', 'C', 'N', 'CA', 'CB', 1.527, 110.4, -61.6],
            ['CD1', 'C', 'CA', 'CB', 'CG1', 1.52, 114.0, 169.8]
        ],
        ring: [],
        note: 'β-分支胺基酸，與纈胺酸同屬 Top8000 的 Ile/Val 拉氏圖類別：β 區最寬廣、α 區偏窄、左手 α 區幾乎不存在。'
    },
    MET: {
        one: 'M', zh: '甲硫胺酸', en: 'Methionine', group: 'nonpolar', cls: 'general',
        atoms: [
            ['CG', 'C', 'N', 'CA', 'CB', 1.52, 113.7, -64.4],
            ['SD', 'S', 'CA', 'CB', 'CG', 1.81, 112.7, -179.6],
            ['CE', 'C', 'CB', 'CG', 'SD', 1.79, 100.6, 70.0]
        ],
        ring: [],
        note: '含硫的柔軟長鏈，沒有分支，是 α-螺旋形成者；也是蛋白質轉譯的起始胺基酸。'
    },
    PHE: {
        one: 'F', zh: '苯丙胺酸', en: 'Phenylalanine', group: 'nonpolar', cls: 'general',
        atoms: PHE_RING, ring: [['CE2', 'CZ']],
        note: '帶有平面苯環的大型疏水側鏈，常埋在蛋白質核心，β-摺疊中出現頻率略高。'
    },
    TRP: {
        one: 'W', zh: '色胺酸', en: 'Tryptophan', group: 'nonpolar', cls: 'general',
        atoms: [
            ['CG', 'C', 'N', 'CA', 'CB', 1.50, 114.1, -66.4],
            ['CD1', 'C', 'CA', 'CB', 'CG', 1.37, 127.1, 96.3],
            ['CD2', 'C', 'CA', 'CB', 'CG', 1.43, 126.7, -83.7],
            ['NE1', 'N', 'CB', 'CG', 'CD1', 1.38, 108.5, 180],
            ['CE2', 'C', 'CB', 'CG', 'CD2', 1.40, 108.5, 180],
            ['CE3', 'C', 'CB', 'CG', 'CD2', 1.40, 133.8, 0],
            ['CZ2', 'C', 'CG', 'CD2', 'CE2', 1.40, 120.0, 180],
            ['CZ3', 'C', 'CG', 'CD2', 'CE3', 1.40, 120.0, 180],
            ['CH2', 'C', 'CD2', 'CE2', 'CZ2', 1.40, 120.0, 0]
        ],
        ring: [['NE1', 'CE2'], ['CZ3', 'CH2']],
        note: '20 種胺基酸中體積最大，具有吲哚雙環；吸收 280 nm 紫外光，是測量蛋白質濃度的關鍵。'
    },
    SER: {
        one: 'S', zh: '絲胺酸', en: 'Serine', group: 'polar', cls: 'general',
        atoms: [['OG', 'O', 'N', 'CA', 'CB', 1.417, 110.8, -63.3]], ring: [],
        note: '羥基 (-OH) 會與主鏈搶氫鍵，常出現在轉角與螺旋起點 (N-cap)；也是磷酸化的主要位點。'
    },
    THR: {
        one: 'T', zh: '蘇胺酸', en: 'Threonine', group: 'polar', cls: 'general',
        atoms: [
            ['OG1', 'O', 'N', 'CA', 'CB', 1.43, 109.2, 60.0],
            ['CG2', 'C', 'N', 'CA', 'CB', 1.53, 111.1, -60.3]
        ],
        ring: [],
        note: '同樣是 β-分支（Cβ 上接 O 與 C），偏好 β-摺疊；但 Top8000 統計仍將它歸在一般類別。'
    },
    CYS: {
        one: 'C', zh: '半胱胺酸', en: 'Cysteine', group: 'polar', cls: 'general',
        atoms: [['SG', 'S', 'N', 'CA', 'CB', 1.808, 113.8, -62.2]], ring: [],
        note: '硫醇基 (-SH) 可與另一個半胱胺酸氧化成雙硫鍵 (S–S)，像焊接點一樣穩定蛋白質（例如頭髮角蛋白）。'
    },
    ASN: {
        one: 'N', zh: '天門冬醯胺', en: 'Asparagine', group: 'polar', cls: 'general',
        atoms: [
            ['CG', 'C', 'N', 'CA', 'CB', 1.52, 112.6, -65.5],
            ['OD1', 'O', 'CA', 'CB', 'CG', 1.23, 120.9, -58.3],
            ['ND2', 'N', 'CA', 'CB', 'CG', 1.33, 116.5, 121.7]
        ],
        ring: [],
        note: '醯胺側鏈能和自己的主鏈形成氫鍵，是除了甘胺酸以外最常出現在左手 α 區的胺基酸，轉角常客。'
    },
    GLN: {
        one: 'Q', zh: '麩醯胺酸', en: 'Glutamine', group: 'polar', cls: 'general',
        atoms: [
            ['CG', 'C', 'N', 'CA', 'CB', 1.52, 113.8, -60.2],
            ['CD', 'C', 'CA', 'CB', 'CG', 1.52, 112.8, -69.6],
            ['OE1', 'O', 'CB', 'CG', 'CD', 1.24, 120.9, -50.5],
            ['NE2', 'N', 'CB', 'CG', 'CD', 1.33, 116.5, 129.5]
        ],
        ring: [],
        note: '比天門冬醯胺多一個 CH₂，側鏈較長而柔軟，是 α-螺旋形成者；多麩醯胺酸重複與亨丁頓舞蹈症有關。'
    },
    TYR: {
        one: 'Y', zh: '酪胺酸', en: 'Tyrosine', group: 'polar', cls: 'general',
        atoms: PHE_RING.concat([['OH', 'O', 'CD1', 'CE1', 'CZ', 1.39, 120.0, 180]]),
        ring: [['CE2', 'CZ']],
        note: '苯環末端多一個羥基，可形成氫鍵與被磷酸化（訊息傳遞），偏好 β-摺疊。'
    },
    ASP: {
        one: 'D', zh: '天門冬胺酸', en: 'Aspartate', group: 'acidic', cls: 'general',
        atoms: [
            ['CG', 'C', 'N', 'CA', 'CB', 1.52, 113.1, -66.4],
            ['OD1', 'O', 'CA', 'CB', 'CG', 1.25, 119.2, -46.7],
            ['OD2', 'O', 'CA', 'CB', 'CG', 1.25, 118.2, 133.3]
        ],
        ring: [],
        note: '帶負電的短側鏈，常抓住螺旋開頭的 N-H（N-cap），也常出現在轉角與酵素活性中心。'
    },
    GLU: {
        one: 'E', zh: '麩胺酸', en: 'Glutamate', group: 'acidic', cls: 'general',
        atoms: [
            ['CG', 'C', 'N', 'CA', 'CB', 1.52, 113.8, -63.8],
            ['CD', 'C', 'CA', 'CB', 'CG', 1.52, 113.3, -179.8],
            ['OE1', 'O', 'CB', 'CG', 'CD', 1.25, 119.0, -6.2],
            ['OE2', 'O', 'CB', 'CG', 'CD', 1.25, 118.1, 173.8]
        ],
        ring: [],
        note: '帶負電的長側鏈，是最強的 α-螺旋形成者之一；常與離胺酸在螺旋上形成 i→i+4 鹽橋。'
    },
    LYS: {
        one: 'K', zh: '離胺酸', en: 'Lysine', group: 'basic', cls: 'general',
        atoms: [
            ['CG', 'C', 'N', 'CA', 'CB', 1.52, 113.8, -64.5],
            ['CD', 'C', 'CA', 'CB', 'CG', 1.52, 111.8, -178.1],
            ['CE', 'C', 'CB', 'CG', 'CD', 1.52, 111.7, -179.6],
            ['NZ', 'N', 'CG', 'CD', 'CE', 1.49, 111.7, 179.6]
        ],
        ring: [],
        note: '末端帶正電胺基的長鏈，多分布在蛋白質表面，是 α-螺旋形成者，也是乙醯化與泛素化的位點。'
    },
    ARG: {
        one: 'R', zh: '精胺酸', en: 'Arginine', group: 'basic', cls: 'general',
        atoms: [
            ['CG', 'C', 'N', 'CA', 'CB', 1.52, 113.8, -65.2],
            ['CD', 'C', 'CA', 'CB', 'CG', 1.52, 111.8, -179.2],
            ['NE', 'N', 'CB', 'CG', 'CD', 1.46, 111.7, -179.3],
            ['CZ', 'C', 'CG', 'CD', 'NE', 1.33, 124.8, -178.7],
            ['NH1', 'N', 'CD', 'NE', 'CZ', 1.33, 120.6, 0],
            ['NH2', 'N', 'CD', 'NE', 'CZ', 1.33, 119.6, 180]
        ],
        ring: [],
        note: '平面胍基帶正電，可同時形成多個氫鍵與鹽橋，常用來抓住 DNA/RNA 的磷酸骨架。'
    },
    HIS: {
        one: 'H', zh: '組胺酸', en: 'Histidine', group: 'basic', cls: 'general',
        atoms: [
            ['CG', 'C', 'N', 'CA', 'CB', 1.49, 113.7, -63.2],
            ['ND1', 'N', 'CA', 'CB', 'CG', 1.38, 122.9, -75.7],
            ['CD2', 'C', 'CA', 'CB', 'CG', 1.36, 130.6, 104.3],
            ['CE1', 'C', 'CB', 'CG', 'ND1', 1.32, 108.5, 180],
            ['NE2', 'N', 'CB', 'CG', 'CD2', 1.35, 108.5, 180]
        ],
        ring: [['CE1', 'NE2']],
        note: '咪唑環的 pKa ≈ 6，在生理 pH 下可在帶電與不帶電之間切換，是酵素活性位點（如絲胺酸蛋白酶）的常客。'
    }
};

// 舊版類別名稱（general / glycine / proline）與大小寫代碼都能轉成資料庫鍵值
const LEGACY_AA_ALIAS = { general: 'ALA', glycine: 'GLY', proline: 'PRO', ileval: 'VAL', prepro: 'PREPRO' };

function normalizeResidueKey(aa) {
    if (!aa) return 'ALA';
    const raw = String(aa).trim();
    if (LEGACY_AA_ALIAS[raw.toLowerCase()]) return LEGACY_AA_ALIAS[raw.toLowerCase()];
    const up = raw.toUpperCase();
    if (AMINO_ACIDS[up]) return up;
    const byOne = Object.keys(AMINO_ACIDS).find(k => AMINO_ACIDS[k].one === up && k !== 'PREPRO');
    return byOne || 'ALA';
}

// PDB 殘基 → 拉氏圖類別（參考 MolProbity / Top8000 分類；下一個殘基是 PRO 時歸為 Pre-Pro）
function ramaClassForResidue(resName, nextResName) {
    if (resName === 'GLY') return 'glycine';
    if (resName === 'PRO') return 'proline';
    if (nextResName === 'PRO') return 'prepro';
    if (resName === 'ILE' || resName === 'VAL') return 'ileval';
    return 'general';
}

// 依分類產生下拉選單 + Apple 風格自訂選單 UI（與原生 select 雙向同步，維持既有程式相容性）
const AA_GROUPS_ORDER = [
    ['special', ['GLY', 'PRO', 'PREPRO']],
    ['nonpolar', ['ALA', 'VAL', 'LEU', 'ILE', 'MET', 'PHE', 'TRP']],
    ['polar', ['SER', 'THR', 'CYS', 'ASN', 'GLN', 'TYR']],
    ['acidic', ['ASP', 'GLU']],
    ['basic', ['LYS', 'ARG', 'HIS']]
];

let aaPickerOpen = false;
let aaPickerFilter = 'all';

(function initAAPicker() {
    const sel = document.getElementById('aaType');
    if (!sel) return;

    // 保留隱藏的原生 select 供既有事件與程式碼同步
    sel.innerHTML = AA_GROUPS_ORDER.map(([g, keys]) => {
        const opts = keys.map(k => {
            const a = AMINO_ACIDS[k];
            const code = k === 'PREPRO' ? 'Pre-Pro' : `${k.charAt(0)}${k.slice(1).toLowerCase()} · ${a.one}`;
            return `<option value="${k}">${a.zh}（${code}）</option>`;
        }).join('');
        return `<optgroup label="${AA_GROUP_INFO[g].zh}">${opts}</optgroup>`;
    }).join('');
    sel.value = 'ALA';
    sel.classList.add('aa-native-hidden');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');

    // 建立 Apple 風格自訂選擇器（彈出面板掛載於 body 頂層，避免被任何卡片層級遮擋）
    const picker = document.createElement('div');
    picker.className = 'aa-picker';
    picker.id = 'aaPicker';
    picker.innerHTML = `
        <button type="button" class="aa-picker-trigger" id="aaPickerTrigger" aria-haspopup="listbox" aria-expanded="false">
            <span class="aa-trigger-left">
                <span class="aa-trigger-glyph" id="aaTriggerGlyph">A</span>
                <span class="aa-trigger-text">
                    <span class="aa-trigger-zh" id="aaTriggerZh">丙胺酸</span>
                    <span class="aa-trigger-sub" id="aaTriggerSub">Alanine · Ala</span>
                </span>
            </span>
            <span class="aa-trigger-right">
                <span class="aa-trigger-cls" id="aaTriggerCls">General</span>
                <svg class="aa-trigger-chevron" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                    <path d="M2.5 4.25L6 7.75L9.5 4.25" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </span>
        </button>
    `;
    sel.insertAdjacentElement('afterend', picker);

    const popover = document.createElement('div');
    popover.className = 'aa-picker-popover';
    popover.id = 'aaPickerPopover';
    popover.setAttribute('role', 'listbox');
    popover.setAttribute('aria-label', '選擇胺基酸');
    popover.innerHTML = `
        <div class="aa-filter-bar" id="aaFilterBar">
            <button type="button" class="aa-filter-pill active" data-group="all">全部 (21)</button>
            ${AA_GROUPS_ORDER.map(([g]) => `<button type="button" class="aa-filter-pill" data-group="${g}"><span class="aa-dot" style="background:${AA_GROUP_INFO[g].color}"></span>${AA_GROUP_INFO[g].zh.split('．')[0]}</button>`).join('')}
        </div>
        <div class="aa-grid-scroll" id="aaGridScroll"></div>
    `;
    document.body.appendChild(popover);

    const trigger = document.getElementById('aaPickerTrigger');
    const filterBar = document.getElementById('aaFilterBar');
    const gridScroll = document.getElementById('aaGridScroll');

    function positionPopover() {
        if (window.innerWidth <= 680) {
            popover.style.left = '';
            popover.style.right = '';
            popover.style.top = '';
            popover.style.bottom = '';
            popover.style.width = '';
            gridScroll.style.maxHeight = '';
            return;
        }
        const rect = trigger.getBoundingClientRect();
        const pad = 12;
        const spaceBelow = window.innerHeight - rect.bottom - pad;
        const spaceAbove = rect.top - pad;
        const openAbove = spaceBelow < 240 && spaceAbove > spaceBelow;

        popover.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))}px`;
        popover.style.width = `${rect.width}px`;

        if (openAbove) {
            popover.style.top = 'auto';
            popover.style.bottom = `${window.innerHeight - rect.top + 6}px`;
            gridScroll.style.maxHeight = `${Math.max(150, Math.min(300, spaceAbove - 74))}px`;
        } else {
            popover.style.bottom = 'auto';
            popover.style.top = `${rect.bottom + 6}px`;
            gridScroll.style.maxHeight = `${Math.max(150, Math.min(300, spaceBelow - 74))}px`;
        }
    }

    function renderPickerGrid(activeKey) {
        const groupsToShow = aaPickerFilter === 'all'
            ? AA_GROUPS_ORDER
            : AA_GROUPS_ORDER.filter(([g]) => g === aaPickerFilter);

        gridScroll.innerHTML = groupsToShow.map(([g, keys]) => {
            const gInfo = AA_GROUP_INFO[g];
            const tiles = keys.map(k => {
                const a = AMINO_ACIDS[k];
                const isSel = k === activeKey;
                const shortCode = k === 'PREPRO' ? 'Pre-P' : (k.charAt(0) + k.slice(1).toLowerCase());
                return `<button type="button" class="aa-tile${isSel ? ' selected' : ''}" data-aa="${k}" role="option" aria-selected="${isSel}">
                    <span class="aa-tile-top">
                        <span class="aa-tile-letter">${a.one}</span>
                        <span class="aa-dot" style="background:${gInfo.color}"></span>
                    </span>
                    <span class="aa-tile-zh">${k === 'PREPRO' ? 'Pre-Pro' : a.zh}</span>
                    <span class="aa-tile-code">${shortCode}</span>
                </button>`;
            }).join('');
            return `<div class="aa-group-section">
                <div class="aa-group-title">${gInfo.zh}</div>
                <div class="aa-tile-grid">${tiles}</div>
            </div>`;
        }).join('');
    }

    function setOpen(open) {
        aaPickerOpen = open;
        picker.classList.toggle('open', open);
        popover.classList.toggle('open', open);
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
            renderPickerGrid(sel.value || 'ALA');
            positionPopover();
        }
    }

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(!aaPickerOpen);
    });

    filterBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.aa-filter-pill');
        if (!btn) return;
        e.stopPropagation();
        aaPickerFilter = btn.dataset.group;
        filterBar.querySelectorAll('.aa-filter-pill').forEach(b => b.classList.toggle('active', b === btn));
        renderPickerGrid(sel.value || 'ALA');
        positionPopover();
    });

    gridScroll.addEventListener('click', (e) => {
        const tile = e.target.closest('.aa-tile');
        if (!tile) return;
        e.stopPropagation();
        const key = tile.dataset.aa;
        sel.value = key;
        sel.dispatchEvent(new Event('change'));
        setOpen(false);
    });

    document.addEventListener('click', (e) => {
        if (aaPickerOpen && !picker.contains(e.target) && !popover.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && aaPickerOpen) setOpen(false);
    });
    window.addEventListener('scroll', () => {
        if (aaPickerOpen) positionPopover();
    }, true);
    window.addEventListener('resize', () => {
        if (aaPickerOpen) positionPopover();
    });

    picker._renderGrid = renderPickerGrid;
})();

function renderAAInfoCard(key) {
    const a = AMINO_ACIDS[key] || AMINO_ACIDS.ALA;
    const g = AA_GROUP_INFO[a.group];
    const cls = RAMA_CLASS_INFO[a.cls];
    const heavy = key === 'GLY' ? 0 : (key === 'PREPRO' ? 1 : 1 + a.atoms.length);
    const code3 = key === 'PREPRO' ? 'Pre-Pro' : `${key.charAt(0)}${key.slice(1).toLowerCase()}`;

    // 同步自訂選單按鈕
    const glyphEl = document.getElementById('aaTriggerGlyph');
    const zhEl = document.getElementById('aaTriggerZh');
    const subEl = document.getElementById('aaTriggerSub');
    const clsEl = document.getElementById('aaTriggerCls');
    const picker = document.getElementById('aaPicker');
    if (picker) picker.style.setProperty('--aa-accent', g.color);
    if (glyphEl) glyphEl.textContent = a.one;
    if (zhEl) zhEl.textContent = a.zh;
    if (subEl) subEl.textContent = `${a.en} · ${code3}`;
    if (clsEl) clsEl.textContent = cls.en;
    if (picker && aaPickerOpen && picker._renderGrid) picker._renderGrid(key);

    // 同步下方資訊卡
    const card = document.getElementById('aaInfoCard');
    if (!card) return;
    card.style.setProperty('--aa-accent', g.color);
    card.innerHTML = `
        <div class="aa-info-chips">
            <span class="aa-chip aa-chip-group"><span class="aa-dot" style="background:${g.color}"></span>${g.zh}</span>
            <span class="aa-chip">拉氏圖：${cls.zh}</span>
            <span class="aa-chip">側鏈重原子 ${heavy}</span>
        </div>
        <p class="aa-info-note">${a.note}</p>`;
}
