import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { appConfig } from '@/app/config/env'
import { ensureCsrfCookie, readXsrfToken } from '@/shared/api/csrf'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'unavailable'

type EchoInstance = Echo<'reverb'>

let echoInstance: EchoInstance | null = null
let echoInitFailed = false

function resolveBroadcastingAuthUrl(): string {
  if (appConfig.apiBaseUrl.startsWith('http://') || appConfig.apiBaseUrl.startsWith('https://')) {
    return `${new URL(appConfig.apiBaseUrl).origin}/api/broadcasting/auth`
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/broadcasting/auth`
  }
  return '/api/broadcasting/auth'
}

export function isRealtimeConfigured(): boolean {
  return Boolean(import.meta.env.VITE_REVERB_APP_KEY)
}

export function getEchoClient(): EchoInstance | null {
  if (echoInitFailed || !isRealtimeConfigured()) {
    return null
  }

  if (echoInstance) {
    return echoInstance
  }

  try {
    echoInstance = new Echo({
      broadcaster: 'reverb',
      key: import.meta.env.VITE_REVERB_APP_KEY!,
      wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
      wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
      wssPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
      forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
      enabledTransports: ['ws', 'wss'],
      disableStats: true,
      authEndpoint: resolveBroadcastingAuthUrl(),
      authorizer: (channel) => ({
        authorize: async (socketId, callback) => {
          try {
            await ensureCsrfCookie()
            const headers: Record<string, string> = {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            }
            const xsrf = readXsrfToken()
            if (xsrf) {
              headers['X-XSRF-TOKEN'] = xsrf
            }

            const response = await fetch(resolveBroadcastingAuthUrl(), {
              method: 'POST',
              credentials: 'include',
              headers,
              body: JSON.stringify({
                socket_id: socketId,
                channel_name: channel.name,
              }),
            })

            if (!response.ok) {
              callback(new Error(`Broadcasting auth failed (${response.status})`), null)
              return
            }

            const data = (await response.json()) as {
              auth: string
              channel_data?: string
              shared_secret?: string
            }
            callback(null, data)
          } catch (error) {
            callback(error instanceof Error ? error : new Error('Broadcasting auth failed'), null)
          }
        },
      }),
      Pusher,
    })

    return echoInstance
  } catch {
    echoInitFailed = true
    echoInstance = null
    return null
  }
}

export function disconnectEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect()
    echoInstance = null
  }
}

/** Test helper — reset singleton between tests. */
export function __resetEchoForTests(): void {
  disconnectEcho()
  echoInitFailed = false
}
