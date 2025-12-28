import html2canvas from 'html2canvas';
import { highlightClass } from '../../utils/sharedConstants';
import type { CSSProperties, ReactNode } from 'react';
import { createStepIcon, type StepIconData } from './StepIconRenderer';

// re-export for convenience
export type { StepIconData } from './StepIconRenderer';
export { serializeLineIcons, deserializeLineIcons } from './StepIconRenderer';

// line of solution with optional step icon data
export interface SolutionLine {
  text: string;
  icon?: StepIconData | null;
}

// pure data input for screenshot generation, usable both client and server-side
export interface ScreenshotData {
  scramble: string;
  solutionLines: SolutionLine[];
  solveTime: number | string;
  totalMoves: number;
  tpsString: string;
  title?: string;
}

// legacy interface for DOM-based screenshot
interface ScreenshotState {
  scrambleHTML: string;
  solutionHTML: string;
  solveTime: number | string;
}

interface ScreenshotExtraData {
  totalMoves: number;
  tpsString: string;
}

// styling constants shared between client and server rendering
export const SCREENSHOT_STYLES = {
  backgroundColor: '#161018',
  wrapperBg: '#221825',
  borderColor: '#525252',
  textColor: '#e5e5e5',
  mutedTextColor: '#a3a3a3',
  primaryColor: '#F0E68C',
  fontSize: {
    base: 18,
    large: 24,
    xl: 32,
  },
  padding: 8,
  lineHeight: 1.6,
  iconSize: 36,
} as const;

// builds stats text from solve data
export function buildStatsText(data: Pick<ScreenshotData, 'solveTime' | 'totalMoves' | 'tpsString'>): string {
  const { solveTime, totalMoves, tpsString } = data;
  
  const parts: string[] = [];
  if (solveTime) parts.push(`${solveTime}\u00A0sec`);
  if (totalMoves) parts.push(`${totalMoves}\u00A0stm`);
  if (tpsString) parts.push(tpsString.replace(' ', '\u00A0'));
  
  return parts.join(', ');
}

// returns inline style objects for use with Satori/ImageResponse
export function getScreenshotStyles() {
  const s = SCREENSHOT_STYLES;
  
  return {
    wrapper: {
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: s.backgroundColor,
      padding: s.padding * 2.5,
      fontFamily: 'system-ui, sans-serif',
      color: s.textColor,
    } as CSSProperties,
    
    title: {
      fontSize: s.fontSize.xl,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#fff',
    } as CSSProperties,
    
    label: {
      fontSize: s.fontSize.base + 8,
      color: s.mutedTextColor,
      marginBottom: 8,
    } as CSSProperties,
    
    textBlock: {
      fontSize: s.fontSize.large,
      lineHeight: s.lineHeight,
      marginBottom: 8,
      fontFamily: 'monospace',
    } as CSSProperties,
    
    solutionLine: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    } as CSSProperties,
    
    solutionText: {
      fontSize: s.fontSize.large,
      lineHeight: s.lineHeight,
      fontFamily: 'monospace',
      color: '#d4d4d4',
    } as CSSProperties,
    
    footer: {
      display: 'flex',
      width: '100%',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: 'auto',
      borderTop: `1px solid ${s.borderColor}`,
      paddingTop: 20,
    } as CSSProperties,
    
    stats: {
      fontSize: s.fontSize.xl + 8,
      fontWeight: 'bold',
      color: '#fff',
    } as CSSProperties,
    
    watermark: {
      fontSize: s.fontSize.large,
      color: s.mutedTextColor,
    } as CSSProperties,
  };
}

type CreateElement = (type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) => ReactNode;

// props for the screenshot JSX content, to be used with ImageResponse
export interface ScreenshotContentProps {
  data: ScreenshotData;
  // react createElement function, passed in to avoid importing React in this file
  // for server-side usage where React may not be available in the same way
  createElement: CreateElement;
}

// generates JSX-compatible content for use with Next.js ImageResponse/Satori.
// returns a tree of elements created via the passed createElement function.
export function createScreenshotContent({ data, createElement }: ScreenshotContentProps): ReactNode {
  const { scramble, solutionLines, solveTime, totalMoves, tpsString, title } = data;
  const styles = getScreenshotStyles();
  const statsText = buildStatsText({ solveTime, totalMoves, tpsString });
  const iconSize = SCREENSHOT_STYLES.iconSize;
  
  const h = createElement;

  // render solution lines with icons, limit to maxLines lines with ellipsis if more
  const maxLines = 9;
  const linesToRender = solutionLines.length > maxLines ? solutionLines.slice(0, maxLines) : solutionLines;
  const solutionContent = linesToRender.map((line, index) => {
    const icon = line.icon ? createStepIcon(line.icon, iconSize, h) : null;
    
    // placeholder div to maintain alignment when no icon
    const iconSlot = icon || h('div', { style: { width: iconSize, height: iconSize, flexShrink: 0 } });
    
    return h('div', { key: index, style: styles.solutionLine },
      iconSlot,
      h('span', { style: styles.solutionText }, line.text)
    );
  });

  // add ellipsis line if there are more than maxLines lines
  if (solutionLines.length > maxLines) {
    const iconSlot = h('div', { style: { width: iconSize, height: iconSize, flexShrink: 0 } });
    solutionContent.push(
      h('div', { key: 'ellipsis', style: { ...styles.solutionLine, marginTop: -12 } },
        iconSlot,
        h('span', { style: styles.solutionText }, '...')
      )
    );
  }
  
  return h('div', { style: styles.wrapper },
    // title && h('div', { style: styles.title }, title),
    
    h('div', { style: { display: 'flex', flexDirection: 'column', marginBottom: 8 } },
      h('div', { style: styles.label }, 'Scramble'),
      h('div', { style: styles.textBlock }, scramble)
    ),
    
    h('div', { style: { display: 'flex', flexDirection: 'column', marginBottom: 8 } },
      h('div', { style: styles.label }, 'Solution'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 0 } }, ...solutionContent)
    ),
    
    h('div', { style: styles.footer },
      h('div', { style: styles.stats }, statsText || ''),
      h('div', { style: styles.watermark }, 'Ao1K.com')
    )
  );
}

export class ScreenshotManager {
  private cache: { blob: Blob; state: ScreenshotState } | null = null;

  private matchesCache(state: ScreenshotState): boolean {
    if (!this.cache) return false;
    const { scrambleHTML, solutionHTML, solveTime } = this.cache.state;
    return (
      scrambleHTML === state.scrambleHTML &&
      solutionHTML === state.solutionHTML &&
      solveTime === state.solveTime
    );
  }

  async getBlob(state: ScreenshotState, extraData: ScreenshotExtraData): Promise<Blob | null> {
    if (this.matchesCache(state)) {
      return this.cache!.blob;
    }

    const blob = await this.generateBlob(state, extraData);
    if (blob) {
      this.cache = { blob, state };
    }
    return blob;
  }

  async copyToClipboard(blob: Blob): Promise<boolean> {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    } catch (error) {
      console.error('Failed to copy screenshot to clipboard:', error);
      return false;
    }
  }

  private async generateBlob(state: ScreenshotState, extraData: ScreenshotExtraData): Promise<Blob | null> {
    const { solveTime } = state;
    const { totalMoves, tpsString } = extraData;

    try {
      const scrambleDiv = document.getElementById('scramble');
      const richSolutionDiv = document.getElementById('rich-solution-display');
      if (!scrambleDiv || !richSolutionDiv) {
        console.error('Scramble or solution div not found');
        return null;
      }

      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.width = 'fit-content';
      wrapper.style.backgroundColor = '#161018';
      wrapper.style.padding = '0';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.gap = '0';
      wrapper.style.padding = '1rem';
      wrapper.style.border = '1px solid #525252';
      wrapper.style.borderRadius = '0.5rem';

      const scrambleClone = scrambleDiv.cloneNode(true) as HTMLElement;
      scrambleClone.style.width = 'fit-content';
      scrambleClone.style.maxWidth = 'none';
      scrambleClone.style.maxHeight = 'none';

      const solutionClone = richSolutionDiv.cloneNode(true) as HTMLElement;
      solutionClone.style.width = 'fit-content';
      solutionClone.style.maxWidth = 'none';
      solutionClone.style.maxHeight = 'none';
      solutionClone.style.overflow = 'visible';

      // remove highlight
      solutionClone.innerHTML = solutionClone.innerHTML.replace(new RegExp(`<span class="${highlightClass}">`, 'g'), '<span class="text-primary-100">');
      
      // find the solution textbox div in the clone and set its width
      const clonedSolutionTextbox = solutionClone.querySelector('#solution') as HTMLElement;
      if (clonedSolutionTextbox) {
        clonedSolutionTextbox.style.width = 'fit-content';
        clonedSolutionTextbox.style.minWidth = '0';
      }

      // fix text positioning in both contenteditable divs and remove borders
      const editableDivs = [scrambleClone, solutionClone].map(clone => 
        clone.querySelector('div[contenteditable="true"]')
      ).filter(Boolean) as HTMLElement[];
      
      editableDivs.forEach(editableDiv => {
        editableDiv.style.paddingTop = '0';
        editableDiv.style.paddingBottom = '1rem';
        editableDiv.style.paddingLeft = '0.5rem';
        editableDiv.style.paddingRight = '0.5rem';
        editableDiv.style.marginTop = '-0.2rem';
        editableDiv.style.border = '1px solid #525252';
        editableDiv.style.borderRadius = '0.125rem';
        editableDiv.style.boxSizing = 'border-box';
        editableDiv.style.lineHeight = '1.6';

        const childDivs = editableDiv.querySelectorAll('div');
        childDivs.forEach((div: HTMLElement) => {
          div.style.marginTop = '0';
          div.style.marginBottom = '0';
          div.style.paddingTop = '0';
        });
      });

      scrambleClone.style.marginBottom = '1rem';
      scrambleClone.style.marginTop = '0';
      scrambleClone.style.paddingTop = '0.25rem';

      solutionClone.style.paddingTop = '0.5rem';
      solutionClone.style.paddingBottom = '0rem';
      solutionClone.style.marginBottom = '-1rem';

      // create info div with time, STM, TPS, and watermark
      const infoDiv = document.createElement('div');
      infoDiv.style.display = 'flex';
      infoDiv.style.justifyContent = 'space-between';
      infoDiv.style.alignItems = 'center';
      infoDiv.style.paddingLeft = '0.5rem';
      infoDiv.style.paddingRight = '0.5rem';
      infoDiv.style.paddingBottom = '1rem';
      infoDiv.style.marginTop = '0';
      infoDiv.style.color = '#e5e5e5';
      infoDiv.style.fontSize = '1.125rem';
      infoDiv.style.fontFamily = 'inherit';

      const timeText = solveTime ? `${solveTime}` : '';
      const stmText = totalMoves ? `${totalMoves} stm` : '';
      
      const firstLineParts: string[] = [];
      if (timeText) firstLineParts.push(`${timeText}\u00A0sec`);
      if (stmText) firstLineParts.push(stmText.replace(' ', '\u00A0'));
      const firstLineText = firstLineParts.join(', ');
      const tpsLine = tpsString ? tpsString.replace(' ', '\u00A0') : '';

      const buildStatsText = (): string => {
        if (tpsLine) {
          if (firstLineText.trim()) {
            return `${firstLineText.trim()}, ${tpsLine}`;
          }
          return tpsLine;
        }

        return firstLineText.trim();
      };

      const statsSpan = document.createElement('span');
      statsSpan.style.whiteSpace = 'pre-line';
      infoDiv.appendChild(statsSpan);

      const watermarkSpan = document.createElement('span');
      watermarkSpan.textContent = 'Ao1K.com';
      infoDiv.appendChild(watermarkSpan);

      wrapper.appendChild(scrambleClone);
      wrapper.appendChild(solutionClone);
      wrapper.appendChild(infoDiv);

      document.body.appendChild(wrapper);

      const scrambleWidth = scrambleClone.offsetWidth;
      const solutionWidth = solutionClone.offsetWidth;

      statsSpan.textContent = buildStatsText();

      let minWidth = Math.min(scrambleWidth, solutionWidth);
      minWidth = Math.max(minWidth, 300);
      scrambleClone.style.width = `${minWidth}px`;
      solutionClone.style.width = `${minWidth}px`;
      if (clonedSolutionTextbox) {
        clonedSolutionTextbox.style.width = `${minWidth}px`;
      }
      infoDiv.style.width = `${minWidth}px`;

      const canvas = await html2canvas(wrapper, {
        backgroundColor: '#221825',
        scale: 1,
        logging: false,
      });

      document.body.removeChild(wrapper);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
      if (!blob) {
        console.error('Failed to generate screenshot blob');
        return null;
      }

      return blob;
    } catch (error) {
      console.error('Failed to build screenshot blob:', error);
      return null;
    }
  }
}
