// useGeolocation.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Location, GeoErrorCode } from './types'

export const GEO_ERROR_MSG: Record<GeoErrorCode, string> = {
  NOT_SUPPORTED: 'GPS를 지원하지 않는 기기예요',
  PERMISSION_DENIED: 'GPS 권한이 필요해요\n설정 → 앱 → 위치 접근 허용',
  POSITION_UNAVAILABLE: 'GPS 신호를 찾을 수 없어요\n야외로 이동 후 다시 시도해 주세요',
  TIMEOUT: 'GPS 응답 시간이 초과됐어요',
}

interface UseGeolocationReturn {
  position: Location | null
  errorCode: GeoErrorCode | null
  loading: boolean
}

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<UseGeolocationReturn>({
    position: null,
    errorCode: null,
    loading: true,
  })
  const watchRef = useRef<number | null>(null)

  const onSuccess = useCallback((pos: GeolocationPosition) => {
    setState({
      position: {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        timestamp: pos.timestamp,
      },
      errorCode: null,
      loading: false,
    })
  }, [])

  const onError = useCallback((err: GeolocationPositionError) => {
    const codeMap: Record<number, GeoErrorCode> = {
      1: 'PERMISSION_DENIED',
      2: 'POSITION_UNAVAILABLE',
      3: 'TIMEOUT',
    }
    setState({
      position: null,
      errorCode: codeMap[err.code] ?? 'POSITION_UNAVAILABLE',
      loading: false,
    })
  }, [])

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({ position: null, errorCode: 'NOT_SUPPORTED', loading: false })
      return
    }
    watchRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 3000,
    })
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [onSuccess, onError])

  return state
}
