// GaragePage.tsx — 내 차고 메뉴 (전시관 화이트 테마)
// 헤더·힌트 오버레이 수정 → 이 파일 / 3D 씬 수정 → GarageScene.tsx

import { useState } from 'react'
import { Zap, ChevronRight } from 'lucide-react'
import GarageScene from './GarageScene'
import { BIKE_LINEUP, LP_KEY, OWNED_BIKES_KEY } from '../../constants/VehicleShopData'

export default function GaragePage() {
  const [lp, setLp] = useState(() =>
    parseInt(localStorage.getItem(LP_KEY) ?? '100')
  )
  const [ownedCcs, setOwnedCcs] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(OWNED_BIKES_KEY) ?? '[50]') }
    catch { return [50] }
  })

  const currentCc   = Math.max(...ownedCcs)
  const currentBike = BIKE_LINEUP.find(b => b.cc === currentCc) ?? BIKE_LINEUP[0]
  const nextBike    = BIKE_LINEUP.find(b => b.cc > currentCc)
  const canUpgrade  = !!nextBike && lp >= nextBike.cost
  const doneSteps   = ownedCcs.length

  const handleUpgrade = () => {
    if (!nextBike || !canUpgrade) return
    const newLp    = lp - nextBike.cost
    const newOwned = [...ownedCcs, nextBike.cc]
    setLp(newLp)
    setOwnedCcs(newOwned)
    localStorage.setItem(LP_KEY,          String(newLp))
    localStorage.setItem(OWNED_BIKES_KEY, JSON.stringify(newOwned))
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: 'calc(100svh - 56px - 112px)', minHeight: 0 }}
    >

      {/* ── 3D 씬 영역 ── */}
      <div
        className="relative"
        style={{ flex: 1, minHeight: 0, background: '#F8F9FA' }}
      >
        <GarageScene />

        {/* 바이크 아래 원형 그림자 — 전시관 느낌 */}
        <div
          className="pointer-events-none absolute z-10"
          style={{
            bottom:    '18%',
            left:      '50%',
            transform: 'translateX(-50%)',
            width:     '55%',
            height:    36,
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.13) 0%, transparent 72%)',
            filter:    'blur(6px)',
          }}
        />

        {/* 타이틀 칩 */}
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center">
          <span
            className="rounded-full px-5 py-1.5 text-xs font-bold tracking-widest text-sub backdrop-blur-md"
            style={{
              background: 'rgba(255,255,255,0.75)',
              border:     '1px solid rgba(0,0,0,0.06)',
              boxShadow:  '0 2px 12px rgba(0,0,0,0.05)',
            }}
          >
            MY GARAGE
          </span>
        </div>

        {/* cc 배지 */}
        <div className="pointer-events-none absolute left-4 top-4 z-20">
          <span
            className="rounded-full px-3 py-1 text-[10px] font-bold text-brand"
            style={{
              background: 'rgba(249,115,22,0.10)',
              border:     '1px solid rgba(249,115,22,0.18)',
            }}
          >
            {currentBike.cc}cc
          </span>
        </div>

        {/* 드래그 힌트 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
          <span
            className="rounded-full px-4 py-1.5 text-[10px] text-muted"
            style={{
              background: 'rgba(255,255,255,0.70)',
              border:     '1px solid rgba(0,0,0,0.05)',
            }}
          >
            드래그 · 핀치로 자유롭게 돌려보세요
          </span>
        </div>

        {/* 테크트리 dot */}
        <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex items-center gap-1">
          {BIKE_LINEUP.map((b, i) => (
            <div
              key={b.cc}
              className={`rounded-full transition-all duration-300 ${
                i < doneSteps ? 'h-1.5 w-3.5 bg-brand' : 'h-1.5 w-1.5 bg-black/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── 하단 정보 패널 ── */}
      <div
        className="flex flex-col gap-4 px-5 pb-5 pt-5"
        style={{
          background:           'rgba(255,255,255,0.80)',
          backdropFilter:       'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop:            '1px solid rgba(0,0,0,0.06)',
        }}
      >
        {/* 바이크 정보 + LP */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">현재 바이크</p>
            <p className="mt-0.5 text-[15px] font-bold text-main">{currentBike.name}</p>
            <p className="mt-0.5 text-[11px] text-muted">{currentBike.flavor}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: currentBike.mapColor, boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}
              />
              <span className="text-[10px] text-muted">맵 아이콘 색상</span>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-2xl px-3 py-2"
            style={{
              background: 'rgba(249,115,22,0.08)',
              border:     '1px solid rgba(249,115,22,0.18)',
            }}
          >
            <Zap size={12} strokeWidth={1.5} className="text-brand" />
            <span className="text-sm font-bold text-brand">{lp.toLocaleString()}</span>
            <span className="text-[9px] text-muted">LP</span>
          </div>
        </div>

        {/* 업그레이드 버튼 */}
        {nextBike ? (
          <button
            onClick={handleUpgrade}
            disabled={!canUpgrade}
            className="flex w-full items-center justify-between rounded-[20px] px-[20px] py-4 transition-all duration-200 active:scale-[0.98]"
            style={canUpgrade ? {
              background: 'var(--brand)',
              color:      '#FFFFFF',
            } : {
              background: 'rgba(0,0,0,0.04)',
              border:     '1px solid rgba(0,0,0,0.06)',
              color:      '#B0B5BC',
            }}
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[10px] font-medium opacity-75">다음 단계</span>
              <span className="text-[14px] font-bold">{nextBike.cc}cc 업그레이드하기</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap size={11} strokeWidth={1.5} />
              <span className="text-xs font-bold">{nextBike.cost.toLocaleString()} LP</span>
              <ChevronRight size={14} strokeWidth={2} className="ml-1" />
            </div>
          </button>
        ) : (
          <div
            className="flex items-center justify-center gap-2 rounded-[20px] py-4"
            style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.18)' }}
          >
            <span className="text-[14px] font-bold text-brand">🏆 최고 등급 달성!</span>
          </div>
        )}

        <p className="text-center text-[10px] text-muted">
          {doneSteps} / {BIKE_LINEUP.length} 단계 해금 · {currentCc}cc 보유 중
        </p>
      </div>
    </div>
  )
}
