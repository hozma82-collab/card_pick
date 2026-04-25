// 丸め処理（小数点以下第6位を切り捨て、第5位まで保持）
export function roundValue(value) {
  return Math.floor(value * 100000) / 100000;
}

// Fisher-Yates シャッフル
export function shuffleDeck(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
