import { gameState, deck, hand, getCard } from './state.js';
import { calculatePrediction, returnCardToHand } from './logic.js';

const uiElements = {
  stage: document.getElementById('ui-stage'),
  turn: document.getElementById('ui-turn'),
  score: document.getElementById('ui-score'),
  maxStages: document.getElementById('ui-max-stages'),
  
  spadeMult: document.getElementById('ui-spade-mult'),
  heartMult: document.getElementById('ui-heart-mult'),
  clubBonus: document.getElementById('ui-club-bonus'),
  diamondBonus: document.getElementById('ui-diamond-bonus'),
  
  rerollCount: document.getElementById('ui-reroll-count'),
  btnReroll: document.getElementById('btn-reroll'),
  btnCalcScore: document.getElementById('btn-calc-score'),
  
  deckCards: document.getElementById('deck-cards'),
  handCards: document.getElementById('hand-cards'),
  keepSlot: document.getElementById('keep-slot'),
  slotA: document.getElementById('slot-a'),
  slotB: document.getElementById('slot-b'),
  slotC: document.getElementById('slot-c'),
  
  predAbMin: document.getElementById('ui-pred-ab-min'),
  predAbMax: document.getElementById('ui-pred-ab-max'),
  predAbMatch: document.getElementById('ui-pred-ab-match'),
  predBcMin: document.getElementById('ui-pred-bc-min'),
  predBcMax: document.getElementById('ui-pred-bc-max'),
  predBcMatch: document.getElementById('ui-pred-bc-match'),
  
  modalOverlay: document.getElementById('modal-overlay'),
  suitModal: document.getElementById('suit-modal'),
  resultModal: document.getElementById('result-modal'),
  turnScoreModal: document.getElementById('turn-score-modal'),
  finalScore: document.getElementById('ui-final-score'),
  turnScoreDetails: document.getElementById('turn-score-details'),
};

const suitSymbols = {
  spade: '♠',
  heart: '♥',
  club: '♣',
  diamond: '♦'
};

function createCardHTML(card) {
  if (!card) return '';
  const displayRank = card.rank;
  return `
    <div class="card ${card.suit}" data-id="${card.id}">
      <div class="card-top">${displayRank} <span class="suit">${suitSymbols[card.suit]}</span></div>
      <div class="card-center"><span class="suit">${suitSymbols[card.suit]}</span></div>
      <div class="card-bottom">${displayRank} <span class="suit">${suitSymbols[card.suit]}</span></div>
    </div>
  `;
}

function createCardBackHTML() {
  return `<div class="card card-back"></div>`;
}

export function renderAll() {
  // Header Stats
  uiElements.stage.innerText = gameState.stage;
  uiElements.turn.innerText = gameState.turn;
  uiElements.score.innerText = gameState.score;
  uiElements.maxStages.innerText = gameState.maxStages;

  // Abilities
  uiElements.spadeMult.innerText = gameState.abilities.spadeMultiplier.toFixed(5);
  uiElements.heartMult.innerText = gameState.abilities.heartMultiplier.toFixed(5);
  uiElements.clubBonus.innerText = gameState.abilities.clubBonus;
  uiElements.diamondBonus.innerText = gameState.abilities.diamondBonus;

  // Reroll
  uiElements.rerollCount.innerText = gameState.rerollCount;
  uiElements.btnReroll.disabled = (gameState.rerollCount >= 3 || gameState.rerolledThisTurn);

  // Deck (top 5 max)
  uiElements.deckCards.innerHTML = '';
  const deckDisplayCount = Math.min(5, deck.length);
  for (let i = 0; i < deckDisplayCount; i++) {
    uiElements.deckCards.innerHTML += createCardBackHTML();
  }

  // Hand
  uiElements.handCards.innerHTML = '';
  hand.forEach(id => {
    const card = getCard(id);
    uiElements.handCards.innerHTML += createCardHTML(card);
  });

  // Keep
  uiElements.keepSlot.innerHTML = '';
  if (gameState.keep) {
    uiElements.keepSlot.innerHTML = createCardHTML(getCard(gameState.keep));
  }

  // Slots
  ['A', 'B', 'C'].forEach(pos => {
    const el = uiElements[`slot${pos}`];
    el.innerHTML = '';
    if (gameState.slots[pos]) {
      el.innerHTML = createCardHTML(getCard(gameState.slots[pos]));
    }
  });

  updatePredictions();

  // Calc Score Button state
  const canCalc = gameState.slots.A && gameState.slots.B && gameState.slots.C;
  uiElements.btnCalcScore.disabled = !canCalc;
}

export function updatePredictions() {
  const predAB = calculatePrediction('A', 'B');
  uiElements.predAbMin.innerText = predAB.min;
  uiElements.predAbMax.innerText = predAB.max;
  uiElements.predAbMatch.innerText = predAB.match ? "Rank Match! (x1.5 + ♥Bonus)" : "";

  const predBC = calculatePrediction('B', 'C');
  uiElements.predBcMin.innerText = predBC.min;
  uiElements.predBcMax.innerText = predBC.max;
  uiElements.predBcMatch.innerText = predBC.match ? "Rank Match! (x1.5 + ♥Bonus)" : "";
}

// Modal handling
export function showSuitSelectionModal() {
  uiElements.modalOverlay.classList.remove('hidden');
  uiElements.suitModal.classList.remove('hidden');
  uiElements.resultModal.classList.add('hidden');
  uiElements.turnScoreModal.classList.add('hidden');
  
  // reset selection
  document.querySelectorAll('.suit-btn').forEach(btn => btn.classList.remove('selected'));
  document.getElementById('btn-confirm-suits').disabled = true;
}

export function hideModals() {
  uiElements.modalOverlay.classList.add('hidden');
  uiElements.suitModal.classList.add('hidden');
  uiElements.resultModal.classList.add('hidden');
  uiElements.turnScoreModal.classList.add('hidden');
}

export function showTurnResult(turnScore, rand1, rand2, matchAB, matchBC) {
  uiElements.modalOverlay.classList.remove('hidden');
  uiElements.turnScoreModal.classList.remove('hidden');
  
  uiElements.turnScoreDetails.innerHTML = `
    <p>A-B Random: <strong>${rand1}</strong> ${matchAB ? '(Matched!)' : ''}</p>
    <p>B-C Random: <strong>${rand2}</strong> ${matchBC ? '(Matched!)' : ''}</p>
    <p>Product: <strong>${rand1 * rand2}</strong></p>
    <hr style="border-color:#555; margin:10px 0;">
    <p>Earned Score: <strong style="color:var(--gold-primary); font-size:1.5rem;">${turnScore}</strong></p>
  `;
}

export function showGameClear() {
  uiElements.modalOverlay.classList.remove('hidden');
  uiElements.resultModal.classList.remove('hidden');
  uiElements.finalScore.innerText = gameState.score;
}

export function getSelectedCardsForReroll() {
  const selectedCards = document.querySelectorAll('#hand-cards .card.selected-for-reroll');
  return Array.from(selectedCards).map(el => el.getAttribute('data-id'));
}
