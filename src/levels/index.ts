import type { Level } from '../engine/types';
import l1 from './l1-env-exfil';
import l2 from './l2-malicious-commit';
import l3 from './l3-dotfile-injection';
import l4 from './l4-mcp-tool-abuse';
import l5 from './l5-coauthor-trust';
import l6 from './l6-egress-bypass';
import l7 from './l7-confused-deputy';
import l8 from './l8-summary-blindness';

export const LEVELS: Level[] = [l1, l2, l3, l4, l5, l6, l7, l8].sort((a, b) => a.order - b.order);

export function levelById(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}
