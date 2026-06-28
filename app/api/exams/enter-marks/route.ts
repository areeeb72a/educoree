import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      exam_paper_id,
      student_id,
      theory_marks,
      practical_marks,
      is_absent,
      marked_by
    } = body

    if (!exam_paper_id || !student_id || !marked_by) {
      return NextResponse.json({ error: 'Exam paper ID, student ID, and marked_by are required' }, { status: 400 })
    }

    // A. Fetch max marks from exam_papers config
    const { data: paper, error: paperError } = await supabaseAdmin
      .from('exam_papers')
      .select('total_marks, passing_marks')
      .eq('id', exam_paper_id)
      .single()

    if (paperError || !paper) {
      return NextResponse.json({ error: 'Exam paper configuration not found' }, { status: 404 })
    }

    const tMarks = parseFloat(theory_marks || 0)
    const pMarks = parseFloat(practical_marks || 0)
    const totalInput = tMarks + pMarks

    // B. Check if marks exceed total marks
    if (totalInput > paper.total_marks) {
      return NextResponse.json({
        error: `Validation Error: Obtained marks (${totalInput}) cannot exceed total marks (${paper.total_marks})`
      }, { status: 400 })
    }

    // C. Check if marks are already locked
    const { data: existingMarks } = await supabaseAdmin
      .from('student_marks')
      .select('is_locked')
      .eq('exam_paper_id', exam_paper_id)
      .eq('student_id', student_id)
      .maybeSingle()

    if (existingMarks?.is_locked) {
      return NextResponse.json({ error: 'This record is locked and approved. Modification denied.' }, { status: 403 })
    }

    // D. Upsert marks
    const { data, error } = await supabaseAdmin
      .from('student_marks')
      .upsert({
        exam_paper_id,
        student_id,
        theory_marks: is_absent ? 0 : tMarks,
        practical_marks: is_absent ? 0 : pMarks,
        is_absent: !!is_absent,
        marked_by,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'student_id,exam_paper_id'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error occurred' }, { status: 500 })
  }
}
