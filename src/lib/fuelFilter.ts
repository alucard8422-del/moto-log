const FUEL_KEYWORDS = ['주유', '오일', '석유', '에너지', '충전소', 'SK', 'GS', 'S-OIL', '현대오일']
const MAX_AMOUNT = 35000

export interface SmsData {
  sender: string
  body: string
  receivedAt: Date
}

export interface FuelDetection {
  storeName: string
  amount: number
  receivedAt: Date
}

export function parseFuelSms(sms: SmsData): FuelDetection | null {
  const text = `${sms.sender} ${sms.body}`

  // 키워드 검사
  const hasKeyword = FUEL_KEYWORDS.some((kw) => text.includes(kw))
  if (!hasKeyword) return null

  // 금액 추출 — "32,000원" 또는 "32000원" 패턴
  const amountMatch = text.match(/([\d,]+)\s*원/)
  if (!amountMatch) return null
  const amount = parseInt(amountMatch[1].replace(/,/g, ''), 10)
  if (isNaN(amount) || amount <= 0 || amount > MAX_AMOUNT) return null

  // 가맹점명 추출 — 여러 SMS 형식 대응
  const storePatterns = [
    /가맹점[:\s]*([^\s\n]+)/,
    /([^\s]+(?:주유소|충전소|칼텍스|에너지|오일뱅크)[^\s]*)/,
  ]
  let storeName = sms.sender
  for (const pattern of storePatterns) {
    const m = text.match(pattern)
    if (m) { storeName = m[1]; break }
  }

  return { storeName, amount, receivedAt: sms.receivedAt }
}
