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
  textColor: '#ECE6EF',
  primaryColor: '#ECE6EF',
  fontSize: {
    base: 18,
    large: 24,
    xl: 32,
  },
  padding: 8,
  lineHeight: 1.6,
} as const;

// returns inline style objects for use with Satori/ImageResponse
export function getScreenshotStyles() {
  const s = SCREENSHOT_STYLES;
  
  return {
    wrapper: {
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'row',
      backgroundColor: s.backgroundColor,
      padding: s.padding * 2.5,
      fontFamily: 'system-ui, sans-serif',
      color: s.textColor,
    } as CSSProperties,
    
    allMoves: {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      height: '100%',
      marginRight: 32,
    } as CSSProperties,

    statsBox: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      flexShrink: 0,
      height: `110%`,
      marginRight: -s.padding * 2.5,
      marginTop: -s.padding * 2.5,
      marginBottom: -s.padding * 2.5,
      backgroundColor: s.wrapperBg,
    } as CSSProperties,

    title: {
      fontSize: s.fontSize.xl,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#fff',
    } as CSSProperties,
    
    label: {
      fontSize: s.fontSize.xl,
      color: '#ACC8D7',
      marginBottom: 2,
    } as CSSProperties,
    
    textBlock: {
      fontSize: s.fontSize.large,
      lineHeight: s.lineHeight,
      marginBottom: 2,
      fontFamily: 'monospace',
    } as CSSProperties,
    
    solutionLine: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    } as CSSProperties,
    
    solutionText: {
      fontSize: s.fontSize.large,
      lineHeight: s.lineHeight,
      fontFamily: 'monospace',
      color: '#d4d4d4',
    } as CSSProperties,
    
    stats: {
      fontSize: s.fontSize.xl + 8,
      display: 'flex',
      maxWidth: '140px',
      fontWeight: 'bold',
      color: s.textColor,
      margin: s.padding * 2.5,
      textAlign: 'right',
    } as CSSProperties,
    
    watermark: {
      fontSize: 36,
      width: '100%',
      color: s.backgroundColor,
      backgroundColor: s.primaryColor,
      padding: '4px 8px',
      marginBottom: s.padding * 2.5,
      fontWeight: 'bold',
      textAlign: 'right',
    } as CSSProperties,
  };
}

const calcMoveTextSize = (lines: SolutionLine[], scramble: string ): number => {
  lines = [...lines, { text: scramble }];
  console.log('lines:', lines);
  let maxFromLineCount: number;
  switch (lines.length) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
      maxFromLineCount = 48;
      break;
    case 5:
    case 6:
      maxFromLineCount = 42;
      break;
    case 7:
    case 8:
      maxFromLineCount = 36;
      break;
    case 9:
      maxFromLineCount = 30;
      break;
    case 10:
      maxFromLineCount = 28;
      break;
    default:
      maxFromLineCount = 24;
      break;
  }

  let maxFromLineWidth = 24;
  const longestLine = lines.reduce((max, line) => Math.max(max, line.text.length), 0);
  // set maxFromLineWidth based on longestLine, only the largest conditional triggers
  if (longestLine >= 80) {
    maxFromLineWidth = 24;
  } else if (longestLine >= 60) {
    maxFromLineWidth = 30;
  } else if (longestLine >= 40) {
    maxFromLineWidth = 36;
  } else if (longestLine >= 30) {
    maxFromLineWidth = 42;
  } else if (longestLine >= 20) {
    maxFromLineWidth = 48;
  }
  console.log(`Longest line: ${longestLine}, maxFromLineWidth: ${maxFromLineWidth}`);
  console.log(`Lines count: ${lines.length}, maxFromLineCount: ${maxFromLineCount}`);
  return Math.min(maxFromLineCount, maxFromLineWidth)
};

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
  
  const h = createElement;
  
  // render solution lines with icons, limit to maxLines lines with ellipsis if more
  const moveTextSize = calcMoveTextSize(solutionLines, scramble);
  styles.solutionText.fontSize = moveTextSize;
  styles.textBlock.fontSize = moveTextSize;
  
  const iconSize = moveTextSize * 1.6; 

  const maxLines = 10;
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
    // Left Column: All Moves
    h('div', { style: styles.allMoves },
      // title && h('div', { style: styles.title }, title),
      
      h('div', { style: { display: 'flex', flexDirection: 'column' } },
        h('div', { style: styles.label }, 'Scramble'),
        h('div', { style: styles.textBlock }, scramble)
      ),
      
      h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, marginBottom: 8, overflow: 'hidden' } },
        h('div', { style: styles.label }, 'Solution'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 1, marginTop: 8 } }, ...solutionContent)
      )
    ),
    
    // Right Column: Stats
    h('div', { style: styles.statsBox },
      h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } },
        solveTime ? h('div', { style: styles.stats }, `${solveTime} sec`) : null,
        totalMoves ? h('div', { style: styles.stats }, `${totalMoves} stm`) : null,
        tpsString ? h('div', { style: styles.stats }, tpsString.replace(' ', '\u00A0')) : null
      ),
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
