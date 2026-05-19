// GaragePage.tsx — 내 차고 메뉴 (Layout 탭 내부)
// 헤더·힌트 오버레이 수정 → 이 파일 / 3D 씬 수정 → GarageScene.tsx

import { useState } from 'react'
import { Zap, ChevronRight } from 'lucide-react'
import GarageScene from './GarageScene'
import { BIKE_LINEUP, LP_KEY, OWNED_BIKES_KEY } from '../../data/VehicleShopData'

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

      {/* ── 3D 씬 영역 — flex-1 + minHeight:0 으로 Canvas 가 남은 공간 전부 차지 ── */}
      <div
        className="relative"
        style={{ flex: 1, minHeight: 0, background: '#060A12' }}
      >
        <GarageScene />

        {/* 타이틀 칩 */}
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
          <span className="rounded-full border border-white/10 bg-slate-950/80 px-5 py-1.5 text-xs font-bold tracking-widest text-white/70 backdrop-blur-md">
            MY GARAGE
          </span>
        </div>

        {/* cc 배지 */}
        <div className="pointer-events-none absolute left-4 top-4 z-10">
          <span className="rounded-full border border-teal-400/20 bg-slate-950/70 px-3 py-1 text-[10px] font-bold text-teal-400 backdrop-blur-sm">
            {currentBike.cc}cc
          </span>
        </div>

        {/* 드래그 힌트 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
          <span className="rounded-full border border-white/5 bg-slate-950/60 px-4 py-1.5 text-[10px] font-light text-white/30 backdrop-blur-sm">
            드래그 · 핀치로 자유롭게 돌려보세요
          </span>
        </div>

        {/* 테크트리 dot */}
        <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex items-center gap-1">
          {BIKE_LINEUP.map((b, i) => (
            <div
              key={b.cc}
              className={`rounded-full transition-all duration-300 ${
                i < doneSteps ? 'h-1.5 w-3.5 bg-teal-400' : 'h-1.5 w-1.5 bg-white/15'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── 하단 정보 패널 ── */}
      <div className="border-t border-white/5 bg-[#0A1220] px-5 pb-5 pt-4 flex flex-col gap-4">
        {/* 바이크 정보 + LP */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-light uppercase tracking-widest text-white/25">
              현재 바이크
            </p>
            <p className="text-sm font-bold text-white">{currentBike.name}</p>
            <p className="mt-0.5 text-[11px] font-light text-white/35">{currentBike.flavor}</p>
            {/* 맵 아이콘 색상 미리보기 */}
            <div className="mt-1.5 flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full ring-1 ring-white/10"
                style={{ backgroundColor: currentBike.mapColor }}
              />
              <span className="text-[10px] font-light text-white/25">맵 아이콘 색상</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl border border-teal-400/20 bg-teal-400/5 px-3 py-2">
            <Zap size={12} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-sm font-bold text-teal-400">{lp.toLocaleString()}</span>
            <span className="text-[9px] font-light text-white/30">LP</span>
          </div>
        </div>

        {/* 업그레이드 버튼 */}
        {nextBike ? (
          <button
            onClick={handleUpgrade}
            disabled={!canUpgrade}
            className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 transition-all duration-200 active:scale-[0.98] ${
              canUpgrade
                ? 'bg-teal-400 text-slate-950'
                : 'border border-white/8 bg-white/[0.03] text-white/25'
            }`}
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[10px] font-light opacity-70">다음 단계</span>
              <span className="text-sm font-bold">{nextBike.cc}cc 업그레이드하기</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap size={11} strokeWidth={1.5} />
              <span className="text-xs font-bold">{nextBike.cost.toLocaleString()} LP</span>
              <ChevronRight size={14} strokeWidth={2} className="ml-1" />
            </div>
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-teal-400/20 py-3.5">
            <span className="text-sm font-bold text-teal-400">🏆 최고 등급 달성!</span>
          </div>
        )}

        <p className="text-center text-[10px] font-light text-white/20">
          {doneSteps} / {BIKE_LINEUP.length} 단계 해금 · {currentCc}cc 보유 중
        </p>
      </div>
    </div>
  )
}
