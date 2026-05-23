import { useState, useEffect, useRef, useCallback } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import type { BackgroundGeolocationPlugin, Location as BGLocation, CallbackError } from '@capacitor-community/background-geolocation'
import type { Location, GeoErrorCode } from './types'

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation')

export const GEO_ERROR_MSG: Record<GeoErrorCode, string> = {
  NOT_SUPPORTED:        'GPS를 지원하지 않는 기기예요',
  PERMISSION_DENIED:    'GPS 권한이 필요해요\n설정 → 앱 → 위치 접근 허용',
  POSITION_UNAVAILABLE: 'GPS 신호를 찾을 수 없어요\n야외로 이동 후 다시 시도해 주세요',
  TIMEOUT:              'GPS 응답 시간이 초과됐어요',
}

interface UseGeolocationReturn {
  position: Location | null
  errorCode: GeoErrorCode | null
  loading: boolean
}

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<UseGeolocationReturn>({
    position: null, errorCode: null, loading: true,
  })
  const watchIdRef = useRef<string | number | null>(null)

  const setPosition = useCallback((lat: number, lng: number, timestamp: number, speed?: number | null, heading?: number | null) => {
    setState({
      position: { lat, lng, timestamp, speed: speed ?? undefined, heading: heading ?? undefined },
      errorCode: null,
      loading: false,
    })
  }, [])

  const setError = useCallback((code: number) => {
    const map: Record<number, GeoErrorCode> = {
      1: 'PERMISSION_DENIED', 2: 'POSITION_UNAVAILABLE', 3: 'TIMEOUT',
    }
    setState({ position: null, errorCode: map[code] ?? 'POSITION_UNAVAILABLE', loading: false })
  }, [])

  useEffect(() => {
    let cancelled = false

    if (Capacitor.isNativePlatform()) {
      // 네이티브(Android): 백그라운드 GPS — 화면 꺼짐, 내비 전환 중에도 기록 유지
      BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: '경로를 기록중입니다',
          backgroundTitle: 'MotoLog',
          requestPermissions: true,
          stale: false,
          distanceFilter: 5,
        },
        (location?: BGLocation, error?: CallbackError) => {
          if (cancelled) return
          if (error) {
            setError(error.code === 'NOT_AUTHORIZED' ? 1 : 2)
            return
          }
          if (location) {
            setPosition(location.latitude, location.longitude, location.time ?? Date.now(), location.speed, location.bearing)
          }
        }
      ).then(id => {
        if (cancelled) {
          BackgroundGeolocation.removeWatcher({ id })
        } else {
          watchIdRef.current = id
        }
      })
    } else {
      // 웹(브라우저): navigator.geolocation 사용
      if (!('geolocation' in navigator)) {
        setState({ position: null, errorCode: 'NOT_SUPPORTED', loading: false })
        return
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        pos => setPosition(pos.coords.latitude, pos.coords.longitude, pos.timestamp, pos.coords.speed, pos.coords.heading),
        err => setError(err.code),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
      )
    }

    return () => {
      cancelled = true
      if (Capacitor.isNativePlatform()) {
        if (watchIdRef.current !== null) {
          BackgroundGeolocation.removeWatcher({ id: watchIdRef.current as string })
        }
      } else {
        if (typeof watchIdRef.current === 'number') {
          navigator.geolocation.clearWatch(watchIdRef.current)
        }
      }
    }
  }, [setPosition, setError])

  return state
}
