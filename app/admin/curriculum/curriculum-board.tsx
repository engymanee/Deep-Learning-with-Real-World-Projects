'use client'

import { useState, useTransition, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { PhaseColumn, type Phase } from './phase-column'
import { LabRowOverlay, type CurriculumItem } from './lab-row'
import { reorderLabs } from './actions'

type PhaseWithItems = Phase & { items: CurriculumItem[] }

/**
 * Drag-and-drop host for the whole curriculum. Items can be reordered
 * within a phase or dragged across phases; the drop is persisted via
 * the `reorderLabs` server action, which rewrites `labs.year_id` and
 * `labs.order_index` in two passes to avoid the unique-index
 * collision.
 *
 * Optimistic local state keeps the UI snappy while the server call is
 * in flight; on failure we roll back to the last known-good snapshot.
 */
export function CurriculumBoard({ initialPhases }: { initialPhases: PhaseWithItems[] }) {
  const [phases, setPhases] = useState<PhaseWithItems[]>(initialPhases)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Snapshot taken at drag start so we can roll back if the save fails.
  const preDragSnapshotRef = useRef<PhaseWithItems[] | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activeItem =
    activeId != null
      ? phases.flatMap((p) => p.items).find((i) => i.id === activeId) ?? null
      : null

  function findPhaseOfItem(itemId: string, list = phases): PhaseWithItems | undefined {
    return list.find((p) => p.items.some((i) => i.id === itemId))
  }

  function handleDragStart(event: DragStartEvent) {
    preDragSnapshotRef.current = phases
    setActiveId(String(event.active.id))
  }

  /**
   * Runs as the drag passes over items and phase columns. When the
   * active item crosses a phase boundary we move it in local state so
   * the placeholder appears in the correct phase. Within-phase
   * reordering is deferred to onDragEnd.
   */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)
    if (activeIdStr === overIdStr) return

    setPhases((prev) => {
      const activePhase = findPhaseOfItem(activeIdStr, prev)
      if (!activePhase) return prev

      // `over` is either a phase id (droppable column) or an item id.
      const overPhase =
        prev.find((p) => p.id === overIdStr) ?? findPhaseOfItem(overIdStr, prev)
      if (!overPhase || activePhase.id === overPhase.id) return prev

      const next = prev.map((p) => ({ ...p, items: [...p.items] }))
      const from = next.find((p) => p.id === activePhase.id)!
      const to = next.find((p) => p.id === overPhase.id)!

      const fromIdx = from.items.findIndex((i) => i.id === activeIdStr)
      if (fromIdx === -1) return prev
      const [moved] = from.items.splice(fromIdx, 1)
      moved.year_id = to.id

      // Insert before the item we're hovering, or at the end if we're
      // hovering the empty phase container.
      const overIdx = to.items.findIndex((i) => i.id === overIdStr)
      to.items.splice(overIdx === -1 ? to.items.length : overIdx, 0, moved)
      return next
    })
  }

  /**
   * Finalise the drop: handle same-phase reordering (onDragOver already
   * handled cross-phase moves), then persist the full new ordering for
   * every phase whose contents changed vs. the pre-drag snapshot.
   */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) {
      preDragSnapshotRef.current = null
      return
    }

    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)

    // Same-phase reorder.
    let committed = phases
    setPhases((prev) => {
      const activePhase = findPhaseOfItem(activeIdStr, prev)
      if (!activePhase) {
        committed = prev
        return prev
      }

      const next = prev.map((p) => ({ ...p, items: [...p.items] }))
      const phase = next.find((p) => p.id === activePhase.id)!
      const fromIdx = phase.items.findIndex((i) => i.id === activeIdStr)
      const toIdx = phase.items.findIndex((i) => i.id === overIdStr)

      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        const [moved] = phase.items.splice(fromIdx, 1)
        phase.items.splice(toIdx, 0, moved)
      }
      committed = next
      return next
    })

    const snapshot = preDragSnapshotRef.current
    preDragSnapshotRef.current = null
    if (!snapshot) return

    // Save only the phases whose ordering actually changed.
    const changed = committed
      .filter((p) => {
        const before = snapshot.find((s) => s.id === p.id)?.items.map((i) => i.id) ?? []
        const after = p.items.map((i) => i.id)
        if (before.length !== after.length) return true
        return before.some((id, i) => id !== after[i])
      })
      .map((p) => ({ year_id: p.id, lab_ids: p.items.map((i) => i.id) }))

    if (changed.length === 0) return

    startTransition(async () => {
      const result = await reorderLabs(changed)
      if (!result.ok) {
        // Roll back on failure so the UI and DB stay in sync.
        setPhases(snapshot)
        console.error('[v0] reorderLabs failed:', result.message)
      }
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-8">
        {phases.map((phase) => (
          <PhaseColumn
            key={phase.id}
            phase={{ id: phase.id, title: phase.title, description: phase.description }}
            items={phase.items}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeItem ? <LabRowOverlay item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
