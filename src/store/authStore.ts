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

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  init: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      const profile = await fetchProfile(session.user.id)
      if (profile) await i18n.changeLanguage(profile.preferred_language)
      set({ session, user: session.user, profile, loading: false, initialized: true })
    } else {
      set({ session: null, user: null, profile: null, loading: false, initialized: true })
    }

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession) {
        const profile = await fetchProfile(newSession.user.id)
        if (profile) await i18n.changeLanguage(profile.preferred_language)
        set({ session: newSession, user: newSession.user, profile })
      } else {
        set({ session: null, user: null, profile: null })
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
