import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import i18n from '../i18n'
import type { Language, Profile } from '../types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  signInWithMagicLink: (email: string, redirectTo?: string) => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateLanguage: (language: Language) => Promise<void>
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  return data as Profile | null
}

let initStarted = false

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  init: async () => {
    if (initStarted) return
    initStarted = true

    const loadProfile = async (userId: string) => {
      const profile = await fetchProfile(userId)
      if (profile) await i18n.changeLanguage(profile.preferred_language)
      set({ profile })
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        set({ session, user: session.user })
        await loadProfile(session.user.id)
      }
    } finally {
      // Always flip initialized, even if session restore throws — otherwise
      // the app is stuck on the blank pre-init screen forever.
      set({ loading: false, initialized: true })
    }

    // This callback must stay synchronous: supabase-js runs it while holding
    // its auth lock, and awaiting a Supabase query here deadlocks because the
    // query waits on that same lock to attach the access token. That hang hit
    // exactly when the app was reopened with an expired token (NFC tap after
    // hours away), making users appear logged out. Profile loading is
    // deferred out of the callback instead.
    supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        set({ session: null, user: null, profile: null })
        return
      }
      const sameUser = get().user?.id === newSession.user.id
      set({ session: newSession, user: newSession.user })
      if (!sameUser || !get().profile) {
        setTimeout(() => {
          void loadProfile(newSession.user.id)
        }, 0)
      }
    })
  },

  signInWithMagicLink: async (email, redirectTo) => {
    const emailRedirectTo = `${import.meta.env.VITE_APP_URL}${redirectTo ?? '/today'}`
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })
    if (error) throw error
  },

  signInWithPassword: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  signUpWithPassword: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null })
  },

  refreshProfile: async () => {
    const user = get().user
    if (!user) return
    const profile = await fetchProfile(user.id)
    set({ profile })
  },

  updateLanguage: async (language) => {
    const user = get().user
    if (!user) return
    await supabase.from('profiles').update({ preferred_language: language }).eq('id', user.id)
    set((state) => ({ profile: state.profile ? { ...state.profile, preferred_language: language } : state.profile }))
  },
}))
