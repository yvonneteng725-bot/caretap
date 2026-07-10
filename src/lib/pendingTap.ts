// When an NFC tap hits /tap/:cardType without a session, the card type is
// parked here so the login page can send the user back to it afterwards.
const KEY = 'caretap-pending-tap'

export function savePendingTap(cardType: string) {
  localStorage.setItem(KEY, cardType)
}

export function consumePendingTap(): string | null {
  const cardType = localStorage.getItem(KEY)
  if (cardType) localStorage.removeItem(KEY)
  return cardType
}
