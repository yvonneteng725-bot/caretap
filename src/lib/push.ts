import { supabase } from './supabase'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function isPushSupported(): Promise<boolean> {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getPushSubscriptionStatus(): Promise<PushSubscription | null> {
  if (!(await isPushSupported())) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  if (!(await isPushSupported())) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.ready
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })

  const { error } = await supabase.from('push_subscriptions').insert({
    user_id: userId,
    subscription: subscription.toJSON(),
  })
  if (error) throw error

  return subscription
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  const subscription = await getPushSubscriptionStatus()
  if (!subscription) return

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .contains('subscription', { endpoint: subscription.endpoint })

  await subscription.unsubscribe()
}
