export function shouldShowInFeedAd(listIndex: number): boolean {
  return (listIndex + 1) % 3 === 0;
}

export function getInFeedAdSlotIndex(listIndex: number): number {
  return Math.floor((listIndex + 1) / 3) - 1;
}
