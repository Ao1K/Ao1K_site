import type { ComponentType } from 'react';

import type {
  SidebarSide,
  StatPlacement,
  StatPlacements,
} from '../../../composables/notimer/statsLayout';
import ChecklistGrid, { CHECKLIST_GRID_ID } from './ChecklistGrid';
import type { StatElementProps } from './statTypes';

export interface StatElementDefinition {
  id: string;
  title: string;
  defaultVisible: boolean;
  defaultSide: SidebarSide;
  Component: ComponentType<StatElementProps>;
}

export const STAT_ELEMENTS: StatElementDefinition[] = [
  {
    id: CHECKLIST_GRID_ID,
    title: 'Grid',
    defaultVisible: true,
    defaultSide: 'right',
    Component: ChecklistGrid,
  },
];

export function placementFor(
  placements: StatPlacements,
  element: StatElementDefinition,
): StatPlacement {
  const stored = placements[element.id];
  return {
    visible: stored?.visible ?? element.defaultVisible,
    side: stored?.side ?? element.defaultSide,
  };
}

export function elementsOnSide(
  placements: StatPlacements,
  side: SidebarSide,
  singleSidebar: boolean,
): StatElementDefinition[] {
  return STAT_ELEMENTS.filter((element) => {
    const placement = placementFor(placements, element);
    if (!placement.visible) return false;
    return singleSidebar || placement.side === side;
  });
}
