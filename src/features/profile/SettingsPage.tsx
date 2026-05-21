// SettingsPage.tsx — 앱 설정 화면 (테마 선택 등) — 테마 완전 대응
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Palette, Sun, Moon, Contrast, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme, type Theme } from '../../context/ThemeContext'

// ── 테마 선택 모달 ─────────────────────────────────────────────────────────
const THEME_OPTIONS: Array<{
  value:   Theme
  label:   string
  sub:     string
  icon:    typeof Moon
  preview: string
  accent:  string
}> = [
  { value: 'light', label: '라이트', sub: '연회색 미니멀 — 낮 환경 최적',   icon: Sun,      preview: '#F8F9FA', accent: '#F97316' },
  { value: 'navy',  label: '네이비', sub: '심해 네이비 — 야간 주행 최적',   icon: Moon,     preview: '#0F172A', accent: '#FF5A00' },
  { value: 'warm',  label: '웜',     sub: '따뜻한 크림 — 감성 라이딩',      icon: Contrast, preview: '#FDF6EC', accent: '#D97706' },
]

function ThemeSelectModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme()

  const handleSelect = (t: Theme) => { setTheme(t); onClose() }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 딤 배경 */}
          <motion.div
            key="dim"
            className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />

          {/* 슬라이드업 시트 — CSS 변수 배경으로 모든 테마 대응 */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 inset-x-0 z-[160] flex justify-center"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
          >
            <div
              className="w-full max-w-sm rounded-t-3xl border px-5 pt-4 pb-10"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor:     'var(--border-line)',
              }}
            >
              {/* 핸들 */}
              <div
                className="mx-auto mb-5 h-1 w-10 rounded-full"
                style={{ backgroundColor: 'var(--border-line)' }}
              />

              <p
                className="mb-4 text-center text-[10px] font-light uppercase tracking-widest"
                style={{ color: 'var(--text-sub)' }}
              >
                테마 선택
              </p>

              {/* 테마 옵션 3종 */}
              <div className="flex flex-col gap-2">
                {THEME_OPTIONS.map(opt => {
                  const Icon     = opt.icon
                  const isActive = theme === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelect(opt.value)}
                      className="flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition-all duration-200 active:opacity-75"
                      style={{
                        borderColor:     isActive ? opt.accent : 'var(--border-line)',
                        backgroundColor: isActive
                          ? `${opt.accent}18`   // 18 = ~10% opacity hex
                          : 'transparent',
                      }}
                    >
                      {/* 컬러 스와치 */}
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border"
                        style={{ backgroundColor: opt.preview, borderColor: 'var(--border-line)' }}
                      >
                        <Icon size={16} strokeWidth={1.5} style={{ color: opt.accent }} />
                      </div>

                      {/* 텍스트 */}
                      <div className="flex-1 text-left">
                        <p
                          className="text-sm font-bold"
                          style={{ color: isActive ? opt.accent : 'var(--text-main)' }}
                        >
                          {opt.label}
                        </p>
                        <p className="text-[10px] font-light" style={{ color: 'var(--text-sub)' }}>
                          {opt.sub}
                        </p>
                      </div>

                      {/* 선택 체크 */}
                      {isActive && (
                        <Check size={16} strokeWidth={2} style={{ color: opt.accent }} className="flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── 설정 항목 공통 Row ─────────────────────────────────────────────────────
function SettingRow({
  label, value, icon: Icon, onClick,
}: {
  label:   string
  value?:  string
  icon:    typeof Palette
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl px-4 py-4 transition-opacity active:opacity-60"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {/* 아이콘 박스 */}
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: 'var(--border-line)' }}
      >
        <Icon size={15} strokeWidth={1.5} className="text-[#FF5A00]" />
      </div>

      <span className="flex-1 text-left text-sm font-medium" style={{ color: 'var(--text-main)' }}>
        {label}
      </span>

      {/* 현재 테마명 표시 */}
      {value && (
        <span className="text-xs font-light" style={{ color: 'var(--text-sub)' }}>
          {value}
        </span>
      )}

      <ChevronRight size={14} strokeWidth={1.5} style={{ color: 'var(--text-sub)' }} className="flex-shrink-0 opacity-50" />
    </button>
  )
}

// ── 메인 설정 페이지 ──────────────────────────────────────────────────────
export default function SettingsPage() {
  const navigate                          = useNavigate()
  const { themeLabel }                    = useTheme()
  const [themeModalOpen, setThemeModalOpen] = useState(false)

  return (
    // 페이지 전체 배경 CSS 변수 사용
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-app)' }}>

      {/* ── 헤더 ── */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-4 backdrop-blur-md"
        style={{
          borderColor:     'var(--border-line)',
          backgroundColor: 'color-mix(in srgb, var(--bg-app) 85%, transparent)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border transition-opacity active:opacity-60"
          style={{ borderColor: 'var(--border-line)', backgroundColor: 'var(--bg-surface)' }}
        >
          <ChevronLeft size={18} strokeWidth={1.5} style={{ color: 'var(--text-main)' }} />
        </button>
        <h1 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>
          설정
        </h1>
      </div>

      {/* ── 설정 항목 목록 ── */}
      <div className="flex flex-col gap-3 px-4 pt-6">

        {/* 섹션 레이블 */}
        <p
          className="px-1 text-[10px] font-light uppercase tracking-widest"
          style={{ color: 'var(--text-sub)' }}
        >
          디스플레이
        </p>

        <SettingRow
          icon={Palette}
          label="테마 선택"
          value={themeLabel}
          onClick={() => setThemeModalOpen(true)}
        />
      </div>

      {/* ── 테마 선택 모달 ── */}
      <ThemeSelectModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      />
    </div>
  )
}
