import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Elder } from '../types'

interface ElderState {
  elders: Elder[]
  selectedElderId: string | null
  loading: boolean
  // User id the current `elders` were loaded for, null until the first
  // fetch completes. Consumers that redirect on "no elders" (OnboardingGate)
  // must wait for this, not just `loading`, because the store mounts with
  // loading=false before any fetch starts. useElders also uses it to fetch
  // once per user instead of on every consumer mount — a mount-triggered
  // fetch flips `loading`, which unmounts the gate's children and would
  // otherwise remount-and-fetch in an endless cycle.
  fetchedFor: string | null
  fetchElders: (userId: string) => Promise<void>
  selectElder: (elderId: string) => void
}

const SELECTED_ELDER_KEY = 'caretap-selected-elder'

export const useElderStore = create<ElderState>((set, get) => ({
  elders: [],
  selectedElderId: localStorage.getItem(SELECTED_ELDER_KEY),
  loading: false,
  fetchedFor: null,

  fetchElders: async (userId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('elder_access')
      .select('elder:elders(*)')
      .eq('user_id', userId)

    if (error || !data) {
      set({ loading: false, fetchedFor: userId })
      return
    }

    const elders = data.map((row) => row.elder).filter(Boolean) as unknown as Elder[]
    const currentSelected = get().selectedElderId
    const stillValid = elders.some((e) => e.id === currentSelected)

    set({
      elders,
      loading: false,
      fetchedFor: userId,
      selectedElderId: stillValid ? currentSelected : (elders[0]?.id ?? null),
    })
  },

  selectElder: (elderId) => {
    localStorage.setItem(SELECTED_ELDER_KEY, elderId)
    set({ selectedElderId: elderId })
  },
}))
