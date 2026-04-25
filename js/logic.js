import { roundValue, shuffleDeck } from './utils.js';
import { gameState, allCards, deck, hand, setCardStatus, getCard } from './state.js';
import { renderAll, showTurnResult, showGameClear } from './ui.js';

// ステージ開始時の初期化
export function startStage(suits) {
  // 1. 各能力値を前ステージで計算された値で上書き
  gameState.abilities.heartMultiplier = gameState.abilities.next.heartMultiplier;
  gameState.abilities.spadeMultiplier = gameState.abilities.next.spadeMultiplier;
  gameState.abilities.clubBonus = gameState.abilities.next.clubBonus;
  gameState.abilities.diamondBonus = gameState.abilities.next.diamondBonus;

  // 2. ターン関連情報を初期化
  gameState.turn = 1;
  gameState.rerollCount = 0;
  gameState.rerolledThisTurn = false;
  gameState.suitsSelected = suits;

  // 3. フィールドを初期化
  hand.length = 0;
  gameState.slots.A = null;
  gameState.slots.B = null;
  gameState.slots.C = null;
  // keepは前ステージから持ち越さず空にする
  if (gameState.keep) {
    setCardStatus(gameState.keep, "retired");
    gameState.keep = null;
  }

  // 4. スート選択によるdeck構築
  // まず全カードをretiredに
  allCards.forEach(c => setCardStatus(c.id, "retired"));
  deck.length = 0;

  const validCards = allCards.filter(c => suits.includes(c.suit));
  validCards.forEach(c => {
    setCardStatus(c.id, "deck");
    deck.push(c.id);
  });

  // シャッフル
  shuffleDeck(deck);

  // ターン開始処理へ
  startTurn();
}

export function startTurn() {
  gameState.rerolledThisTurn = false;
  
  // ターン開始時のドロー処理
  const drawCount = Math.min(5, deck.length);
  const drawn = deck.splice(0, drawCount);
  
  hand.length = 0;
  drawn.forEach(id => {
    setCardStatus(id, "hand");
    hand.push(id);
  });
}

// リロール処理
export function performReroll(selectedIds) {
  if (gameState.rerollCount >= 3) return false;
  if (gameState.rerolledThisTurn) return false;

  // 1. handから対象カードを取り除く
  selectedIds.forEach(id => {
    const index = hand.indexOf(id);
    if (index > -1) {
      hand.splice(index, 1);
    }
  });

  // 2. statusをdeckに変更
  selectedIds.forEach(id => {
    setCardStatus(id, "deck");
  });

  // 3. deck末尾に追加
  deck.push(...selectedIds);

  // 4. シャッフル
  shuffleDeck(deck);

  // 5. 同枚数ドロー
  const drawCount = Math.min(selectedIds.length, deck.length);
  const redrawn = deck.splice(0, drawCount);

  // 6. handに追加
  redrawn.forEach(id => {
    setCardStatus(id, "hand");
    hand.push(id);
  });

  gameState.rerollCount++;
  gameState.rerolledThisTurn = true;
  return true;
}

// カードの移動処理 (hand -> slot/keep)
export function placeCard(cardId, target) {
  const card = getCard(cardId);
  if (!card) return false;

  // Handからの移動
  if (card.status === "hand") {
    const index = hand.indexOf(cardId);
    if (index > -1) hand.splice(index, 1);
    
    if (target === "keep") {
      if (gameState.keep !== null) return false; // 既にkeepがある
      setCardStatus(cardId, "keep");
      gameState.keep = cardId;
      return true;
    } else if (["A", "B", "C"].includes(target)) {
      if (gameState.slots[target] !== null) return false; // 既に配置済み
      setCardStatus(cardId, "slots");
      gameState.slots[target] = cardId;
      return true;
    }
  } 
  // Keepからの移動
  else if (card.status === "keep") {
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

// カードをHandに戻す (keepからは戻せない)
export function returnCardToHand(target) {
  if (["A", "B", "C"].includes(target)) {
    const cardId = gameState.slots[target];
    if (cardId) {
      gameState.slots[target] = null;
      setCardStatus(cardId, "hand");
      hand.push(cardId);
      return true;
    }
  }
  // keepからは手札に戻せない仕様
  return false;
}

// 予測スコア範囲の計算
export function calculatePrediction(slot1, slot2) {
  if (!gameState.slots[slot1] || !gameState.slots[slot2]) {
    return { min: "?", max: "?", match: false };
  }
  
  const c1 = getCard(gameState.slots[slot1]);
  const c2 = getCard(gameState.slots[slot2]);
  
  let rank1 = c1.rank;
  let rank2 = c2.rank;
  
  let min = Math.min(rank1, rank2);
  let max = Math.max(rank1, rank2);
  
  // 現在のボーナスを適用
  min += gameState.abilities.clubBonus;
  max += gameState.abilities.diamondBonus;
  
  if (max < min) {
    max = min;
  }
  
  const match = (rank1 === rank2);
  return { min, max, match };
}

// ターンのスコア計算実行
export function calculateTurnScore() {
  if (!gameState.slots.A || !gameState.slots.B || !gameState.slots.C) return;

  const cardA = getCard(gameState.slots.A);
  const cardB = getCard(gameState.slots.B);
  const cardC = getCard(gameState.slots.C);

  // 1. スート一致判定と能力更新
  // A-B
  if (cardA.suit === cardB.suit) {
    applySuitAbility(cardA.suit);
  }
  // B-C
  if (cardB.suit === cardC.suit) {
    applySuitAbility(cardB.suit);
  }

  // 2. A-B の乱数生成
  let min1 = Math.min(cardA.rank, cardB.rank) + gameState.abilities.clubBonus;
  let max1 = Math.max(cardA.rank, cardB.rank) + gameState.abilities.diamondBonus;
  if (max1 < min1) max1 = min1;
  let rand1 = Math.floor(Math.random() * (max1 - min1 + 1)) + min1;

  // 3. B-C の乱数生成
  let min2 = Math.min(cardB.rank, cardC.rank) + gameState.abilities.clubBonus;
  let max2 = Math.max(cardB.rank, cardC.rank) + gameState.abilities.diamondBonus;
  if (max2 < min2) max2 = min2;
  let rand2 = Math.floor(Math.random() * (max2 - min2 + 1)) + min2;

  // 4. 特殊条件 (ランク一致)
  if (cardA.rank === cardB.rank) {
    rand1 = Math.floor(rand1 * 1.5 * gameState.abilities.heartMultiplier);
  }
  if (cardB.rank === cardC.rank) {
    rand2 = Math.floor(rand2 * 1.5 * gameState.abilities.heartMultiplier);
  }

  // 5. 補正後の乱数掛け合わせ
  let product = rand1 * rand2;

  // 6. spadeMultiplier乗算
  let finalResult = product * gameState.abilities.spadeMultiplier;

  // 7. 最終結果切り捨て
  let turnScore = Math.floor(finalResult);

  // gameState更新
  gameState.score += turnScore;

  // 結果の表示をUIに依頼
  showTurnResult(turnScore, rand1, rand2, cardA.rank === cardB.rank, cardB.rank === cardC.rank);
}

function applySuitAbility(suit) {
  if (suit === "spade") {
    gameState.abilities.spadeMultiplier = roundValue(gameState.abilities.spadeMultiplier * 1.05);
  } else if (suit === "heart") {
    gameState.abilities.heartMultiplier = roundValue(gameState.abilities.heartMultiplier * 1.05);
  } else if (suit === "club") {
    gameState.abilities.clubBonus += 1;
  } else if (suit === "diamond") {
    gameState.abilities.diamondBonus += 1;
  }
}

// ターン終了時の状態遷移
export function endTurn() {
  // 1. 場のカードをリタイア
  ['A', 'B', 'C'].forEach(pos => {
    if (gameState.slots[pos]) {
      setCardStatus(gameState.slots[pos], "retired");
      gameState.slots[pos] = null;
    }
  });

  // 2. 手札に残っているカードをリタイア
  hand.forEach(id => {
    setCardStatus(id, "retired");
  });
  hand.length = 0;

  // 3. キープカードは維持（何もしない）

  // 4. スロット初期化（1で対応済み）

  // 5. ターン+1
  gameState.turn++;

  // 6. ステージ終了判定
  if (gameState.turn >= 6) {
    endStage();
  } else {
    startTurn();
    renderAll();
  }
}

// ステージ終了処理
function endStage() {
  // 次ステージへの能力値持ち越し計算
  const spAdd = gameState.abilities.spadeMultiplier - 1;
  gameState.abilities.next.spadeMultiplier = roundValue(1 + (spAdd * 0.5));

  const htAdd = gameState.abilities.heartMultiplier - 1;
  gameState.abilities.next.heartMultiplier = roundValue(1 + (htAdd * 0.5));

  gameState.abilities.next.clubBonus = Math.floor(gameState.abilities.clubBonus * 0.5);
  gameState.abilities.next.diamondBonus = Math.floor(gameState.abilities.diamondBonus * 0.5);

  gameState.stage++;

  if (gameState.stage > gameState.maxStages) {
    // ゲーム終了
    showGameClear();
  } else {
    // 次のステージへ。スート選択画面を再度表示するようUIに依頼
    const { requestSuitSelection } = require('./ui.js'); // 動的インポート風に扱うが、ここではイベント発火などを利用するのが良い
    // 循環参照を避けるため、main.js側でハンドリングするイベントを発火
    document.dispatchEvent(new Event('stageEnded'));
  }
}
