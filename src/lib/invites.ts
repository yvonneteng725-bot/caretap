import { supabase } from './supabase'
import type { UserRole } from '../types'

export interface FamilyMember {
  access_id: string
  user_id: string
  display_name: string | null
  full_name: string | null
  role: UserRole
}

export async function listFamilyMembers(elderId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('elder_access')
    .select('id, user_id, role, profile:profiles(display_name, full_name)')
    .eq('elder_id', elderId)

  if (error || !data) return []

  return data.map((row: any) => ({
    access_id: row.id,
    user_id: row.user_id,
    role: row.role,
    display_name: row.profile?.display_name ?? null,
    full_name: row.profile?.full_name ?? null,
  }))
}

export async function removeFamilyMember(accessId: string): Promise<void> {
  await supabase.from('elder_access').delete().eq('id', accessId)
}

export async function createInvite(elderId: string, role: UserRole = 'family'): Promise<string> {
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('invites')
    .insert({ elder_id: elderId, role, expires_at: expiresAt })
    .select('token')
    .single()

  if (error || !data) throw error ?? new Error('Failed to create invite')

  return `${import.meta.env.VITE_APP_URL}/join/${data.token}`
}

export async function redeemInvite(token: string): Promise<{ elder_id: string } > {
  const { data, error } = await supabase.rpc('redeem_invite', { invite_token: token })
  if (error) throw error
  return data
}
