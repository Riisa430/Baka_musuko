/**
 * ウマ娘グループ一覧
 * - data.json を読み込み、グループごとにキャラクターを一覧表示する
 * - キャラクターカードをクリックすると詳細モーダルを開く
 */

// ===== 定数 =====
const NO_IMAGE = 'images/noimage.png';
const IMAGE_BASE = 'images/';

// ===== グローバル状態 =====
let groupsData = [];        // グループ配列
let charactersData = [];    // キャラクター配列
let groupMap = {};          // group_id -> group オブジェクト のマップ

// ===== エントリーポイント =====
document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupModal(); // モーダルのイベントは先にセットしておく

  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    groupsData = Array.isArray(data.groups) ? data.groups : [];
    charactersData = Array.isArray(data.characters) ? data.characters : [];

    // group_id から group を素早く引けるマップを作成
    groupMap = {};
    groupsData.forEach(g => {
      if (g && g.group_id) groupMap[g.group_id] = g;
    });

    renderGroups();
  } catch (err) {
    console.error('data.json の読み込みに失敗:', err);
    document.getElementById('app').innerHTML =
      '<p class="error">データの読み込みに失敗しました。</p>';
  }
}

// ===== グループ一覧の描画 =====
function renderGroups() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // グループを display_order 昇順でソート
  const sortedGroups = [...groupsData].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );

  if (sortedGroups.length === 0) {
    app.innerHTML = '<p class="empty-group">表示できるグループがありません。</p>';
    return;
  }

  sortedGroups.forEach(group => {
    // このグループに所属するキャラクターを抽出し display_order 昇順でソート
    const members = charactersData
      .filter(c => Array.isArray(c.groups) && c.groups.includes(group.group_id))
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    const section = document.createElement('section');
    section.className = 'group';
    // CSS 変数でグループ色を渡す
    section.style.setProperty('--group-color', group.color || '#888');

    // --- グループヘッダー ---
    const header = document.createElement('div');
    header.className = 'group-header';

    const label = document.createElement('span');
    label.className = 'group-label';
    label.textContent = group.label || '(名称未設定)';

    const count = document.createElement('span');
    count.className = 'group-count';
    count.textContent = `${members.length}人`;

    header.appendChild(label);
    header.appendChild(count);
    section.appendChild(header);

    // --- メンバー一覧 ---
    if (members.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-group';
      empty.textContent = '所属キャラクターはいません。';
      section.appendChild(empty);
    } else {
      const grid = document.createElement('div');
      grid.className = 'character-grid';
      members.forEach(char => grid.appendChild(createCharacterCard(char)));
      section.appendChild(grid);
    }

    app.appendChild(section);
  });
}

// ===== キャラクターカードの生成 =====
function createCharacterCard(char) {
  const card = document.createElement('div');
  card.className = 'character-card';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${char.name || '名称未設定'} の詳細を開く`);

  // 画像
  const img = document.createElement('img');
  img.className = 'character-image';
  img.src = getImageSrc(char.image);
  img.alt = char.name || '';
  img.loading = 'lazy';
  // 画像読み込み失敗時は noimage.png にフォールバック
  img.addEventListener('error', () => {
    if (img.src.endsWith('noimage.png')) return; // 無限ループ防止
    img.src = NO_IMAGE;
  });

  // 名前
  const name = document.createElement('div');
  name.className = 'character-name';
  name.textContent = char.name || '(名称未設定)';

  card.appendChild(img);
  card.appendChild(name);

  // クリック / Enter / Space で詳細モーダルを開く
  card.addEventListener('click', () => openModal(char));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(char);
    }
  });

  return card;
}

// ===== 画像パス解決（空ならダミー画像） =====
function getImageSrc(imageName) {
  if (!imageName || typeof imageName !== 'string' || imageName.trim() === '') {
    return NO_IMAGE;
  }
  return IMAGE_BASE + imageName;
}

// ===== モーダル制御 =====
function setupModal() {
  const modal = document.getElementById('modal');
  const closeBtn = document.getElementById('modal-close');

  // 閉じるボタン
  closeBtn.addEventListener('click', closeModal);

  // モーダル外（オーバーレイ）クリックで閉じる
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Escキーで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });
}

function openModal(char) {
  const modal = document.getElementById('modal');
  const img = document.getElementById('modal-image');
  const nameEl = document.getElementById('modal-name');
  const descEl = document.getElementById('modal-description');
  const shoeEl = document.getElementById('modal-shoe-size');
  const threeEl = document.getElementById('modal-three-sizes');
  const groupsEl = document.getElementById('modal-groups');

  // 画像
  img.src = getImageSrc(char.image);
  img.alt = char.name || '';
  img.onerror = () => {
    if (img.src.endsWith('noimage.png')) return;
    img.src = NO_IMAGE;
  };

  // 名前
  nameEl.textContent = char.name || '(名称未設定)';

  // 説明
  descEl.textContent =
    (typeof char.description === 'string' && char.description.trim() !== '')
      ? char.description
      : '説明未設定';

  // 足のサイズ: 数値 → "22.5cm"、空なら "未設定"
  if (char.shoe_size === null || char.shoe_size === undefined || char.shoe_size === '') {
    shoeEl.textContent = '未設定';
  } else {
    shoeEl.textContent = `${char.shoe_size}cm`;
  }

  // スリーサイズ
  threeEl.textContent =
    (typeof char.three_sizes === 'string' && char.three_sizes.trim() !== '')
      ? char.three_sizes
      : '未設定';

  // 所属グループ: group_id ではなく label をチップで表示
  groupsEl.innerHTML = '';
  const groupIds = Array.isArray(char.groups) ? char.groups : [];
  let chipCount = 0;
  groupIds.forEach(gid => {
    const g = groupMap[gid];
    if (!g) return; // 未知の group_id は無視
    const chip = document.createElement('span');
    chip.className = 'group-chip';
    chip.textContent = g.label || gid;
    chip.style.backgroundColor = g.color || '#888';
    groupsEl.appendChild(chip);
    chipCount++;
  });
  if (chipCount === 0) {
    groupsEl.textContent = '未設定';
  }

  // 表示
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // 背景スクロール抑止
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
