import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const student_id = searchParams.get('student_id')
    const exam_id = searchParams.get('exam_id')

    if (!student_id || !exam_id) {
      return NextResponse.json({ error: 'student_id and exam_id are required' }, { status: 400 })
    }

    // Fetch marks matching student and exam_id
    const { data: marks, error } = await supabaseAdmin
      .from('student_marks')
      .select('*, exam_papers!inner(*)')
      .eq('student_id', student_id)
      .eq('exam_papers.exam_id', exam_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Process and format data with percentage and grade
    const formattedTranscript = (marks || []).map((m: any) => {
      const paper = m.exam_papers
      const obtained = parseFloat(m.theory_marks || 0) + parseFloat(m.practical_marks || 0)
      const total = paper.total_marks
      const percentage = total > 0 ? parseFloat(((obtained / total) * 100).toFixed(2)) : 0
      
      let grade = 'F'
      if (m.is_absent) grade = 'Absent'
      else if (percentage >= 90) grade = 'A+'
      else if (percentage >= 80) grade = 'A'
      else if (percentage >= 70) grade = 'B'
      else if (percentage >= 60) grade = 'C'
      else if (percentage >= 50) grade = 'D'
      
      const status = m.is_absent ? 'Absent' : (obtained >= paper.passing_marks ? 'Pass' : 'Fail')

      return {
        subject: paper.subject,
        theory_marks: m.theory_marks,
        practical_marks: m.practical_marks,
        total_obtained: obtained,
        total_marks: total,
        passing_marks: paper.passing_marks,
        percentage,
        grade,
        status,
        is_locked: m.is_locked,
        is_absent: m.is_absent
      }
    })

    return NextResponse.json({ success: true, transcript: formattedTranscript })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error occurred' }, { status: 500 })
  }
}
