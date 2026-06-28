"use client"

import { useEffect } from "react"

export default function GlobalKeyboardNavigator() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter") {
        const target = e.target as HTMLElement
        if (
          target &&
          (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")
        ) {
          // If it is a submit button, let it click
          if (target.getAttribute("type") === "submit") return

          // Find the container (form, card, modal, or fallback to body)
          const container = target.closest("form") || target.closest(".card") || target.closest("div[role='dialog']") || document.body
          if (!container) return

          // Find all focusable elements inside this container
          const focusableSelector = "input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), button:not([disabled])"
          const focusables = Array.from(container.querySelectorAll(focusableSelector)) as HTMLElement[]
          
          const index = focusables.indexOf(target)
          if (index > -1 && index < focusables.length - 1) {
            e.preventDefault()
            const nextElement = focusables[index + 1]
            nextElement.focus()
            
            // Auto-select text in inputs
            if (nextElement instanceof HTMLInputElement && (nextElement.type === "text" || nextElement.type === "email" || nextElement.type === "password" || nextElement.type === "number")) {
              nextElement.select()
            }
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return null
}
