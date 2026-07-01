import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Elder } from '../types'

interface ElderState {
  elders: Elder[]
  selectedElderId: string | null
  loading: boolean
  fetchElders: (userId: string) => Promise<void>
  selectElder: (elderId: string) => void
}

const SELECTED_ELDER_KEY = 'caretap-selected-elder'

export const useElderStore = create<ElderState>((set, get) => ({
  elders: [],
  selectedElderId: localStorage.getItem(SELECTED_ELDER_KEY),
  loading: false,

  fetchElders: async (userId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('elder_access')
      .select('elder:elders(*)')
      .eq('user_id', userId)

    if (error || !data) {
      set({ loading: false })
      return
    }

    const elders = data.map((row) => row.elder).filter(Boolean) as unknown as Elder[]
    const currentSelected = get().selectedElderId
    const stillValid = elders.some((e) => e.id === currentSelected)

    set({
      elders,
      loading: false,
      selectedElderId: stillValid ? currentSelected : (elders[0]?.id ?? null),
    })
  },

  selectElder: (elderId) => {
    localStorage.setItem(SELECTED_ELDER_KEY, elderId)
    set({ selectedElderId: elderId })
  },
}))
