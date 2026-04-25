import { initAllCards, initGameAbilities, gameState } from './state.js';
import { startStage, performReroll, placeCard, returnCardToHand, calculateTurnScore, endTurn } from './logic.js';
import { renderAll, showSuitSelectionModal, hideModals, getSelectedCardsForReroll } from './ui.js';

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  initAllCards();
  initGameAbilities();
  gameState.stage = 1;
  gameState.score = 0;
  
  registerEventListeners();
  
  // 最初のステージ開始
  showSuitSelectionModal();
});

// ステージ終了時に発火するイベント
document.addEventListener('stageEnded', () => {
  showSuitSelectionModal();
});

function registerEventListeners() {
  // --- モーダル: スート選択 ---
  const suitBtns = document.querySelectorAll('.suit-btn');
  const confirmSuitsBtn = document.getElementById('btn-confirm-suits');
  let selectedSuits = [];

  suitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const suit = btn.getAttribute('data-suit');
      if (selectedSuits.includes(suit)) {
        selectedSuits = selectedSuits.filter(s => s !== suit);
        btn.classList.remove('selected');
      } else {
        if (selectedSuits.length < 2) {
          selectedSuits.push(suit);
          btn.classList.add('selected');
        }
      }
      confirmSuitsBtn.disabled = selectedSuits.length !== 2;
    });
  });

  confirmSuitsBtn.addEventListener('click', () => {
    if (selectedSuits.length === 2) {
      hideModals();
      startStage(selectedSuits);
      renderAll();
      // リセット
      selectedSuits = [];
      suitBtns.forEach(b => b.classList.remove('selected'));
      confirmSuitsBtn.disabled = true;
    }
  });

  // --- 手札のカード選択 ---
  document.getElementById('hand-cards').addEventListener('click', (e) => {
    const cardEl = e.target.closest('.card');
    if (!cardEl) return;
    cardEl.classList.toggle('selected-for-reroll');
  });

  // --- リロールボタン ---
  document.getElementById('btn-reroll').addEventListener('click', () => {
    const selectedIds = getSelectedCardsForReroll();
    if (selectedIds.length > 0) {
      const success = performReroll(selectedIds);
      if (success) {
        renderAll();
      }
    }
  });

  // --- 配置ロジック (Hand/Keep -> Slots/Keep) ---
  const slots = ['A', 'B', 'C'];
  
  slots.forEach(pos => {
    const slotEl = document.getElementById(`slot-${pos.toLowerCase()}`);
    
    // スロットをクリックして配置
    slotEl.addEventListener('click', () => {
      if (!gameState.slots[pos]) {
        handleSlotClick(pos);
      }
    });

    // スロットのカードをダブルクリックで手札に戻す
    slotEl.addEventListener('dblclick', () => {
      const success = returnCardToHand(pos);
      if (success) {
        renderAll();
      }
    });
  });

  // キープ枠のイベント
  const keepSlotEl = document.getElementById('keep-slot');
  keepSlotEl.addEventListener('click', (e) => {
    const cardEl = e.target.closest('.card');
    if (cardEl) {
      // キープ内のカードを選択状態にする (スロットへ移動するため)
      cardEl.classList.toggle('selected-for-reroll');
    } else {
      // 空のキープ枠をクリックした場合、配置を試みる
      handleSlotClick('keep');
    }
  });

  // --- ゲーム進行 ---
  document.getElementById('btn-calc-score').addEventListener('click', () => {
    calculateTurnScore();
  });

  document.getElementById('btn-next-turn').addEventListener('click', () => {
    hideModals();
    endTurn();
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    hideModals();
    initAllCards();
    initGameAbilities();
    gameState.stage = 1;
    gameState.score = 0;
    showSuitSelectionModal();
  });
}

function handleSlotClick(target) {
  // 手札またはキープで選択されているカードを取得
  // (キープにあるカードも selected-for-reroll クラスを持つ想定)
  let selectedId = null;
  
  // まず手札の選択を確認
  const handSelected = document.querySelectorAll('#hand-cards .card.selected-for-reroll');
  if (handSelected.length === 1) {
    selectedId = handSelected[0].getAttribute('data-id');
  } 
  // 手札で選択がなければ、キープの選択を確認
  else if (handSelected.length === 0) {
    const keepSelected = document.querySelectorAll('#keep-slot .card.selected-for-reroll');
    if (keepSelected.length === 1) {
      selectedId = keepSelected[0].getAttribute('data-id');
    }
  }

  // 1枚だけ選択されている場合のみ移動を実行
  if (selectedId) {
    const success = placeCard(selectedId, target);
    if (success) {
      renderAll();
    }
  }
}
