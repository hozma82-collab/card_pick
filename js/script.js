// --- utils ---
function roundValue(value) {
  return Math.floor(value * 100000) / 100000;
}

function shuffleDeck(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// --- state ---
const gameState = {
  stage: 1,
  maxStages: 2, // <!-- 総ステージ数 -->
  turn: 1,
  score: 0,
  rerollCount: 0,
  suitsSelected: [],
  slots: {
    A: null,
    B: null,
    C: null
  },
  keep: null,
  abilities: {
    heartMultiplier: 1,
    spadeMultiplier: 1,
    clubBonus: 0,
    diamondBonus: 0,
    next: {
      heartMultiplier: 1,
      spadeMultiplier: 1,
      clubBonus: 0,
      diamondBonus: 0
    }
  },
  rerolledThisTurn: false
};

let allCards = [];
let deck = [];
let hand = [];

function initAllCards() {
  allCards = [];
  const suits = ['spade', 'heart', 'club', 'diamond'];
  let idCounter = 1;
  
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      allCards.push({
        id: `card_${idCounter++}`,
        suit,
        rank,
        status: "retired"
      });
    }
  }
}

function getCard(id) {
  return allCards.find(c => c.id === id);
}

function setCardStatus(id, newStatus) {
  const card = getCard(id);
  if (card) {
    card.status = newStatus;
  }
}

function initGameAbilities() {
  gameState.abilities.heartMultiplier = 1;
  gameState.abilities.spadeMultiplier = 1;
  gameState.abilities.clubBonus = 0;
  gameState.abilities.diamondBonus = 0;
  
  gameState.abilities.next.heartMultiplier = 1;
  gameState.abilities.next.spadeMultiplier = 1;
  gameState.abilities.next.clubBonus = 0;
  gameState.abilities.next.diamondBonus = 0;
}

// --- logic ---
function startStage(suits) {
  gameState.abilities.heartMultiplier = gameState.abilities.next.heartMultiplier;
  gameState.abilities.spadeMultiplier = gameState.abilities.next.spadeMultiplier;
  gameState.abilities.clubBonus = gameState.abilities.next.clubBonus;
  gameState.abilities.diamondBonus = gameState.abilities.next.diamondBonus;

  gameState.turn = 1;
  gameState.rerollCount = 0;
  gameState.rerolledThisTurn = false;
  gameState.suitsSelected = suits;

  hand.length = 0;
  gameState.slots.A = null;
  gameState.slots.B = null;
  gameState.slots.C = null;
  
  if (gameState.keep) {
    setCardStatus(gameState.keep, "retired");
    gameState.keep = null;
  }

  allCards.forEach(c => setCardStatus(c.id, "retired"));
  deck.length = 0;

  const validCards = allCards.filter(c => suits.includes(c.suit));
  validCards.forEach(c => {
    setCardStatus(c.id, "deck");
    deck.push(c.id);
  });

  shuffleDeck(deck);
  startTurn();
}

function startTurn() {
  gameState.rerolledThisTurn = false;
  
  const drawCount = Math.min(5, deck.length);
  const drawn = deck.splice(0, drawCount);
  
  hand.length = 0;
  drawn.forEach(id => {
    setCardStatus(id, "hand");
    hand.push(id);
  });
}

function performReroll(selectedIds) {
  if (gameState.rerollCount >= 3) return false;
  if (gameState.rerolledThisTurn) return false;

  selectedIds.forEach(id => {
    const index = hand.indexOf(id);
    if (index > -1) {
      hand.splice(index, 1);
    }
  });

  selectedIds.forEach(id => {
    setCardStatus(id, "deck");
  });

  deck.push(...selectedIds);
  shuffleDeck(deck);

  const drawCount = Math.min(selectedIds.length, deck.length);
  const redrawn = deck.splice(0, drawCount);

  redrawn.forEach(id => {
    setCardStatus(id, "hand");
    hand.push(id);
  });

  gameState.rerollCount++;
  gameState.rerolledThisTurn = true;
  return true;
}

function placeCard(cardId, target) {
  const card = getCard(cardId);
  if (!card) return false;

  if (card.status === "hand") {
    const index = hand.indexOf(cardId);
    if (index > -1) hand.splice(index, 1);
    
    if (target === "keep") {
      if (gameState.keep !== null) return false;
      setCardStatus(cardId, "keep");
      gameState.keep = cardId;
      return true;
    } else if (["A", "B", "C"].includes(target)) {
      if (gameState.slots[target] !== null) return false;
      setCardStatus(cardId, "slots");
      gameState.slots[target] = cardId;
      return true;
    }
  } else if (card.status === "keep") {
    if (["A", "B", "C"].includes(target)) {
      if (gameState.slots[target] !== null) return false;
      gameState.keep = null;
      setCardStatus(cardId, "slots");
      gameState.slots[target] = cardId;
      return true;
    }
  }
  
  return false;
}

function returnCardToHand(target) {
  if (["A", "B", "C"].includes(target)) {
    const cardId = gameState.slots[target];
    if (cardId) {
      gameState.slots[target] = null;
      setCardStatus(cardId, "hand");
      hand.push(cardId);
      return true;
    }
  }
  return false;
}

function calculatePrediction(slot1, slot2) {
  if (!gameState.slots[slot1] || !gameState.slots[slot2]) {
    return { min: "?", max: "?", match: false };
  }
  
  const c1 = getCard(gameState.slots[slot1]);
  const c2 = getCard(gameState.slots[slot2]);
  
  let rank1 = c1.rank;
  let rank2 = c2.rank;
  
  let min = Math.min(rank1, rank2);
  let max = Math.max(rank1, rank2);
  
  min += gameState.abilities.clubBonus;
  max += gameState.abilities.diamondBonus;
  
  if (max < min) max = min;
  
  const match = (rank1 === rank2);
  return { min, max, match };
}

function calculateTurnScore() {
  if (!gameState.slots.A || !gameState.slots.B || !gameState.slots.C) return;

  const cardA = getCard(gameState.slots.A);
  const cardB = getCard(gameState.slots.B);
  const cardC = getCard(gameState.slots.C);

  if (cardA.suit === cardB.suit) applySuitAbility(cardA.suit);
  if (cardB.suit === cardC.suit) applySuitAbility(cardB.suit);

  let min1 = Math.min(cardA.rank, cardB.rank) + gameState.abilities.clubBonus;
  let max1 = Math.max(cardA.rank, cardB.rank) + gameState.abilities.diamondBonus;
  if (max1 < min1) max1 = min1;
  let rand1 = Math.floor(Math.random() * (max1 - min1 + 1)) + min1;

  let min2 = Math.min(cardB.rank, cardC.rank) + gameState.abilities.clubBonus;
  let max2 = Math.max(cardB.rank, cardC.rank) + gameState.abilities.diamondBonus;
  if (max2 < min2) max2 = min2;
  let rand2 = Math.floor(Math.random() * (max2 - min2 + 1)) + min2;

  // ランク一致でのボーナス (基本1.5倍)
  if (cardA.rank === cardB.rank) {
    rand1 = Math.floor(rand1 * 1.5 * gameState.abilities.heartMultiplier);
  }
  if (cardB.rank === cardC.rank) {
    rand2 = Math.floor(rand2 * 1.5 * gameState.abilities.heartMultiplier);
  }

  let product = rand1 * rand2;
  let finalResult = product * gameState.abilities.spadeMultiplier;
  let turnScore = Math.floor(finalResult);

  const prevScore = gameState.score;
  gameState.score += turnScore;
  const newScore = gameState.score;
  
  updateScoreEffect(newScore);

  // モーダルへ渡す情報（計算式の表示用）
  const multInfo = {
    spade: gameState.abilities.spadeMultiplier,
    matchAB: cardA.rank === cardB.rank,
    matchBC: cardB.rank === cardC.rank,
    product: product
  };

  showTurnResult(turnScore, rand1, rand2, prevScore, newScore, multInfo);
}

// ユーザーが数値を手直しする場合は、ここの数値を調整します。
function applySuitAbility(suit) {
  if (suit === "spade") {
    // 全体倍率の増加幅
    gameState.abilities.spadeMultiplier = roundValue(gameState.abilities.spadeMultiplier * 1.1);
  } else if (suit === "heart") {
    // ランク一致倍率の増加幅
    gameState.abilities.heartMultiplier = roundValue(gameState.abilities.heartMultiplier * 1.13);
  } else if (suit === "club") {
    // 最小値ボーナスの増加幅
    gameState.abilities.clubBonus += 1;
  } else if (suit === "diamond") {
    // 最大値ボーナスの増加幅
    gameState.abilities.diamondBonus += 1;
  }
}

// 累計スコアに応じたエフェクトクラスをbodyに付与
function updateScoreEffect(score) {
  // 現在のtierクラスを削除
  for (let i = 1400; i <= 2500; i += 100) {
    document.body.classList.remove(`tier-${i}`);
  }
  
  if (score >= 1400) {
    // 最大2100までの100単位の階級を計算
    let tier = Math.floor(score / 100) * 100;
    if (tier > 2100) tier = 2100;
    document.body.classList.add(`tier-${tier}`);
  }
}

function endTurn() {
  ['A', 'B', 'C'].forEach(pos => {
    if (gameState.slots[pos]) {
      setCardStatus(gameState.slots[pos], "retired");
      gameState.slots[pos] = null;
    }
  });

  hand.forEach(id => {
    setCardStatus(id, "retired");
  });
  hand.length = 0;

  gameState.turn++;

  if (gameState.turn >= 6) {
    endStage();
  } else {
    startTurn();
    renderAll();
  }
}

// 次ステージへの持ち越し計算（数値を変更する場合はここも調整）
function endStage() {
  const spAdd = gameState.abilities.spadeMultiplier - 1;
  gameState.abilities.next.spadeMultiplier = roundValue(1 + (spAdd * 0.5));

  const htAdd = gameState.abilities.heartMultiplier - 1;
  gameState.abilities.next.heartMultiplier = roundValue(1 + (htAdd * 0.5));

  gameState.abilities.next.clubBonus = Math.floor(gameState.abilities.clubBonus * 0.5);
  gameState.abilities.next.diamondBonus = Math.floor(gameState.abilities.diamondBonus * 0.5);

  gameState.stage++;

  if (gameState.stage > gameState.maxStages) {
    showGameClear();
  } else {
    document.dispatchEvent(new Event('stageEnded'));
  }
}

// --- UI ---
const uiElements = {
  get stage() { return document.getElementById('ui-stage'); },
  get turn() { return document.getElementById('ui-turn'); },
  get score() { return document.getElementById('ui-score'); },
  get maxStages() { return document.getElementById('ui-max-stages'); },
  
  get spadeMult() { return document.getElementById('ui-spade-mult'); },
  get heartMult() { return document.getElementById('ui-heart-mult'); },
  get clubBonus() { return document.getElementById('ui-club-bonus'); },
  get diamondBonus() { return document.getElementById('ui-diamond-bonus'); },
  
  get rerollCount() { return document.getElementById('ui-reroll-count'); },
  get btnReroll() { return document.getElementById('btn-reroll'); },
  get btnCalcScore() { return document.getElementById('btn-calc-score'); },
  
  get deckCards() { return document.getElementById('deck-cards'); },
  get handCards() { return document.getElementById('hand-cards'); },
  get keepSlot() { return document.getElementById('keep-slot'); },
  get slotA() { return document.getElementById('slot-a'); },
  get slotB() { return document.getElementById('slot-b'); },
  get slotC() { return document.getElementById('slot-c'); },
  
  get predAbMin() { return document.getElementById('ui-pred-ab-min'); },
  get predAbMax() { return document.getElementById('ui-pred-ab-max'); },
  get predAbMatch() { return document.getElementById('ui-pred-ab-match'); },
  get predBcMin() { return document.getElementById('ui-pred-bc-min'); },
  get predBcMax() { return document.getElementById('ui-pred-bc-max'); },
  get predBcMatch() { return document.getElementById('ui-pred-bc-match'); },
  
  get modalOverlay() { return document.getElementById('modal-overlay'); },
  get suitModal() { return document.getElementById('suit-modal'); },
  get resultModal() { return document.getElementById('result-modal'); },
  get turnScoreModal() { return document.getElementById('turn-score-modal'); },
  get finalScore() { return document.getElementById('ui-final-score'); },
  get turnScoreDetails() { return document.getElementById('turn-score-details'); },
};

const suitSymbols = {
  spade: '♠',
  heart: '♥',
  club: '♣',
  diamond: '♦'
};

function createCardHTML(card) {
  if (!card) return '';
  let colorClass = (card.suit === 'heart' || card.suit === 'diamond') ? 'red' : 'black';
  return `
    <div class="card ${card.suit}" data-id="${card.id}">
      <div class="card-top" style="color: ${colorClass === 'red' ? '#e63946' : '#111'}">${card.rank} <span class="suit">${suitSymbols[card.suit]}</span></div>
      <div class="card-center" style="color: ${colorClass === 'red' ? '#e63946' : '#111'}"><span class="suit">${suitSymbols[card.suit]}</span></div>
      <div class="card-bottom" style="color: ${colorClass === 'red' ? '#e63946' : '#111'}">${card.rank} <span class="suit">${suitSymbols[card.suit]}</span></div>
    </div>
  `;
}

function renderAll() {
  uiElements.stage.innerText = gameState.stage;
  uiElements.turn.innerText = gameState.turn;
  uiElements.score.innerText = gameState.score;
  uiElements.maxStages.innerText = gameState.maxStages;

  uiElements.spadeMult.innerText = gameState.abilities.spadeMultiplier.toFixed(5);
  uiElements.heartMult.innerText = gameState.abilities.heartMultiplier.toFixed(5);
  uiElements.clubBonus.innerText = gameState.abilities.clubBonus;
  uiElements.diamondBonus.innerText = gameState.abilities.diamondBonus;

  uiElements.rerollCount.innerText = gameState.rerollCount;
  uiElements.btnReroll.disabled = (gameState.rerollCount >= 3 || gameState.rerolledThisTurn);

  // 山札（表向きに表示）
  uiElements.deckCards.innerHTML = '';
  const deckDisplayCount = Math.min(3, deck.length);
  for (let i = 0; i < deckDisplayCount; i++) {
    uiElements.deckCards.innerHTML += createCardHTML(getCard(deck[i]));
  }

  uiElements.handCards.innerHTML = '';
  hand.forEach(id => {
    uiElements.handCards.innerHTML += createCardHTML(getCard(id));
  });

  uiElements.keepSlot.innerHTML = '';
  if (gameState.keep) {
    uiElements.keepSlot.innerHTML = createCardHTML(getCard(gameState.keep));
  }

  // スロットの描画とエフェクト判定
  const cardA = getCard(gameState.slots.A);
  const cardB = getCard(gameState.slots.B);
  const cardC = getCard(gameState.slots.C);

  // エフェクトクラスのリセット
  ['A', 'B', 'C'].forEach(pos => {
    uiElements[`slot${pos}`].classList.remove('suit-match', 'rank-match');
    uiElements[`slot${pos}`].innerHTML = '';
    if (gameState.slots[pos]) {
      uiElements[`slot${pos}`].innerHTML = createCardHTML(getCard(gameState.slots[pos]));
    }
  });

  // 一致判定による視覚エフェクト付与
  if (cardA && cardB) {
    if (cardA.suit === cardB.suit) {
      uiElements.slotA.classList.add('suit-match');
      uiElements.slotB.classList.add('suit-match');
    }
    if (cardA.rank === cardB.rank) {
      uiElements.slotA.classList.add('rank-match');
      uiElements.slotB.classList.add('rank-match');
    }
  }
  if (cardB && cardC) {
    if (cardB.suit === cardC.suit) {
      uiElements.slotB.classList.add('suit-match');
      uiElements.slotC.classList.add('suit-match');
    }
    if (cardB.rank === cardC.rank) {
      uiElements.slotB.classList.add('rank-match');
      uiElements.slotC.classList.add('rank-match');
    }
  }

  updatePredictions();

  const canCalc = gameState.slots.A && gameState.slots.B && gameState.slots.C;
  uiElements.btnCalcScore.disabled = !canCalc;
}

function updatePredictions() {
  const predAB = calculatePrediction('A', 'B');
  uiElements.predAbMin.innerText = predAB.min;
  uiElements.predAbMax.innerText = predAB.max;
  uiElements.predAbMatch.innerText = predAB.match ? "ランク一致！ (ボーナスあり)" : "";

  const predBC = calculatePrediction('B', 'C');
  uiElements.predBcMin.innerText = predBC.min;
  uiElements.predBcMax.innerText = predBC.max;
  uiElements.predBcMatch.innerText = predBC.match ? "ランク一致！ (ボーナスあり)" : "";
}

function showSuitSelectionModal() {
  uiElements.modalOverlay.classList.remove('hidden');
  uiElements.suitModal.classList.remove('hidden');
  uiElements.resultModal.classList.add('hidden');
  uiElements.turnScoreModal.classList.add('hidden');
  
  document.querySelectorAll('.suit-btn').forEach(btn => btn.classList.remove('selected'));
  document.getElementById('btn-confirm-suits').disabled = true;
}

function hideModals() {
  uiElements.modalOverlay.classList.add('hidden');
  uiElements.suitModal.classList.add('hidden');
  uiElements.resultModal.classList.add('hidden');
  uiElements.turnScoreModal.classList.add('hidden');
}

function showTurnResult(turnScore, rand1, rand2, prevScore, newScore, multInfo) {
  uiElements.modalOverlay.classList.remove('hidden');
  uiElements.turnScoreModal.classList.remove('hidden');
  
  let calculationMethod = `
    <p>生成乱数: <strong>${rand1}</strong> × <strong>${rand2}</strong> = ${multInfo.product}</p>
  `;
  
  if (multInfo.spade > 1) {
    calculationMethod += `<p>全体倍率(♠)適用: × ${multInfo.spade.toFixed(5)}</p>`;
  }

  uiElements.turnScoreDetails.innerHTML = `
    <div style="font-size: 0.9rem; color: #ccc;">
      ${calculationMethod}
    </div>
    <div style="margin: 1.5rem 0;">
      <span style="font-size: 1rem; color: #a0a0a0;">今ターンの獲得スコア</span><br>
      <strong style="color:var(--gold-primary); font-size:4.5rem; text-shadow: 0 0 20px rgba(212, 175, 55, 0.8);">${turnScore}</strong>
    </div>
    <hr style="border-color:#555; margin:10px 0;">
    <div style="font-size: 1.2rem;">
      累計: <strong>${prevScore}</strong> + <strong>${turnScore}</strong> = <strong style="color:var(--gold-light);">${newScore}</strong>
    </div>
  `;
}

function showGameClear() {
  uiElements.modalOverlay.classList.remove('hidden');
  uiElements.resultModal.classList.remove('hidden');
  uiElements.finalScore.innerText = gameState.score;
  
  // 最終スコアに応じたコメントの設定
  const score = gameState.score;
  let comment = "";
  if (score >= 2700) comment = "神";
  else if (score >= 2500) comment = "アンビリーバブル！";
  else if (score >= 2400) comment = "パーフェクト！";
  else if (score >= 2300) comment = "マーベラス！";
  else if (score >= 2200) comment = "ファンタスティック！";
  else if (score >= 2100) comment = "アメージング！";
  else if (score >= 2000) comment = "ワンダフル！";
  else if (score >= 1900) comment = "グレート！";
  else if (score >= 1800) comment = "クール！";
  else if (score >= 1700) comment = "グッド！";
  else if (score >= 1600) comment = "ナイス！";
  
  const commentEl = document.getElementById('ui-final-comment');
  commentEl.innerText = comment;
  
  // 最終画面にもエフェクトの余韻を残すためにモーダルのスタイルを少し強化（CSSに依存）
  if (score >= 1800) {
    uiElements.resultModal.style.boxShadow = "0 0 50px rgba(255, 0, 0, 0.6)";
    uiElements.resultModal.style.borderColor = "#ff0000";
  } else if (score >= 1500) {
    uiElements.resultModal.style.boxShadow = "0 0 30px rgba(148, 0, 211, 0.6)";
    uiElements.resultModal.style.borderColor = "#9400d3";
  }
}

function getSelectedCardsForReroll() {
  const selectedCards = document.querySelectorAll('#hand-cards .card.selected-for-reroll');
  return Array.from(selectedCards).map(el => el.getAttribute('data-id'));
}

// --- Main execution ---
document.addEventListener('DOMContentLoaded', () => {
  initAllCards();
  initGameAbilities();
  gameState.stage = 1;
  gameState.score = 0;
  updateScoreEffect(0);
  
  registerEventListeners();
  
  showSuitSelectionModal();
});

document.addEventListener('stageEnded', () => {
  showSuitSelectionModal();
});

function registerEventListeners() {
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
      selectedSuits = [];
      suitBtns.forEach(b => b.classList.remove('selected'));
      confirmSuitsBtn.disabled = true;
    }
  });

  document.getElementById('hand-cards').addEventListener('click', (e) => {
    const cardEl = e.target.closest('.card');
    if (!cardEl) return;
    cardEl.classList.toggle('selected-for-reroll');
  });

  document.getElementById('btn-reroll').addEventListener('click', () => {
    const selectedIds = getSelectedCardsForReroll();
    if (selectedIds.length > 0) {
      const success = performReroll(selectedIds);
      if (success) {
        renderAll();
      }
    }
  });

  const slots = ['A', 'B', 'C'];
  slots.forEach(pos => {
    const slotEl = document.getElementById(`slot-${pos.toLowerCase()}`);
    slotEl.addEventListener('click', () => {
      if (!gameState.slots[pos]) {
        handleSlotClick(pos);
      }
    });

    slotEl.addEventListener('dblclick', () => {
      const success = returnCardToHand(pos);
      if (success) {
        renderAll();
      }
    });
  });

  const keepSlotEl = document.getElementById('keep-slot');
  keepSlotEl.addEventListener('click', (e) => {
    const cardEl = e.target.closest('.card');
    if (cardEl) {
      cardEl.classList.toggle('selected-for-reroll');
    } else {
      handleSlotClick('keep');
    }
  });

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
    updateScoreEffect(0); // エフェクトリセット
    // 最終画面で変更したスタイルをリセット
    uiElements.resultModal.style.boxShadow = "";
    uiElements.resultModal.style.borderColor = "";
    
    showSuitSelectionModal();
  });
}

function handleSlotClick(target) {
  let selectedId = null;
  const handSelected = document.querySelectorAll('#hand-cards .card.selected-for-reroll');
  if (handSelected.length === 1) {
    selectedId = handSelected[0].getAttribute('data-id');
  } else if (handSelected.length === 0) {
    const keepSelected = document.querySelectorAll('#keep-slot .card.selected-for-reroll');
    if (keepSelected.length === 1) {
      selectedId = keepSelected[0].getAttribute('data-id');
    }
  }

  if (selectedId) {
    const success = placeCard(selectedId, target);
    if (success) {
      renderAll();
    }
  }
}
