import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import i18n from '../i18n'
import type { Language, Profile } from '../types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  isAuthenticated: boolean
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
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
  isAuthenticated: false,
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

    // STEP 1: subscribe BEFORE restoring the session so no auth event is
    // missed. Do NOT await Supabase calls inside this callback — it runs
    // while supabase-js holds its auth lock, and an awaited query deadlocks
    // waiting on that same lock (the "logged out after NFC tap" hang).
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const sameUser = get().user?.id === session.user.id
        set({ session, user: session.user, isAuthenticated: true })
        if (!sameUser || !get().profile) void loadProfile(session.user.id)
      } else {
        set({ session: null, user: null, profile: null, isAuthenticated: false })
      }
      set({ loading: false, initialized: true })
    })

    // STEP 2: THEN restore any persisted session from localStorage.
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        set({ session, user: session.user, isAuthenticated: true })
        await loadProfile(session.user.id)
      }
    } finally {
      // Always flip initialized, even if session restore throws — otherwise
      // the app is stuck on the blank pre-init screen forever.
      set({ loading: false, initialized: true })
    }
  },

  signInWithPassword: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  signUpWithPassword: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    // With email confirmation enabled, signUp returns a user but no session
    // until the address is verified.
    return { needsEmailConfirmation: !data.session }
  },

  resetPassword: async (email) => {
    const appUrl = (import.meta.env.VITE_APP_URL as string | undefined) ?? window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    })
    if (error) throw error
  },

  updatePassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, isAuthenticated: false })
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
