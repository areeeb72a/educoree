"use client";

import { useEffect } from "react";

export default function TeacherAppraisalPage() {
  useEffect(() => {
    window.location.href = "/dashboard/teacher";
  }, []);

  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
      Redirecting...
    </div>
  );
}
