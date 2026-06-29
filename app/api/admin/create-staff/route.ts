import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Server-side only — uses service role key, never exposed to browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      email,
      password,
      name,
      role,
      school_id,
      branch_id,
      phone,
      father_name,
      address,
      blood_group,
      emergency_name,
      emergency_phone,
      joining_date,
      photo_url,
      nic_number,
      subject_specialization
    } = body

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Email, password, name, and role are required' }, { status: 400 })
    }

    // 1. Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification since admin is creating this account
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Generate auto_id (simple pattern, can be refined later)
    const rolePrefix: Record<string, string> = {
      teacher: 'TH',
      admin: 'AD',
      accounts: 'AC',
      principal: 'PR',
      school_owner: 'OWN',
      super_admin: 'SA',
      parent: 'PAR',
    }
    const prefix = rolePrefix[role] || 'STF'
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const auto_id = `STAFF-${prefix}${randomSuffix}`

    // 3. Create the profile record
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        school_id,
        branch_id,
        role,
        name,
        auto_id,
        phone: phone || null,
        father_name: father_name || null,
        address: address || null,
        blood_group: blood_group || null,
        emergency_name: emergency_name || null,
        emergency_phone: emergency_phone || null,
        joining_date: joining_date || null,
        photo_url: photo_url || null,
        nic_number: nic_number || null,
        subject_specialization: subject_specialization || null,
        active: true,
      })
      .select()
      .single()

    if (profileError) {
      // rollback: delete the auth user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, profile: profileData })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}
