export const gameState = {
  stage: 1,
  maxStages: 2, // <!-- 総ステージ数 -->
  turn: 1,
  score: 0,
  rerollCount: 0,
  suitsSelected: [], // 選択された2つのスート
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

// 全カード (allCards)
export let allCards = [];
// 動的状態
export let deck = [];
export let hand = [];

// 全カードの生成処理
export function initAllCards() {
  allCards = [];
  const suits = ['spade', 'heart', 'club', 'diamond'];
  let idCounter = 1;
  
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      allCards.push({
        id: `card_${idCounter++}`,
        suit,
        rank,
        status: "retired" // "deck" | "hand" | "slots" | "keep" | "retired"
      });
    }
  }
}

// idからカードオブジェクトを取得するヘルパー
export function getCard(id) {
  return allCards.find(c => c.id === id);
}

// カードのstatus変更（直接代入禁止のルールに則る）
export function setCardStatus(id, newStatus) {
  const card = getCard(id);
  if (card) {
    card.status = newStatus;
  }
}

// gameStateの能力値をリセットする（ゲーム開始時）
export function initGameAbilities() {
  gameState.abilities.heartMultiplier = 1;
  gameState.abilities.spadeMultiplier = 1;
  gameState.abilities.clubBonus = 0;
  gameState.abilities.diamondBonus = 0;
  
  gameState.abilities.next.heartMultiplier = 1;
  gameState.abilities.next.spadeMultiplier = 1;
  gameState.abilities.next.clubBonus = 0;
  gameState.abilities.next.diamondBonus = 0;
}
