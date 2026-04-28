import { normalizeConfidence, normalizeEmotion } from './ai.service';

describe('AiService normalization helpers', () => {
  it('normalizes spanish and english emotion labels', () => {
    expect(normalizeEmotion('alegría')).toBe('Joy');
    expect(normalizeEmotion('Love')).toBe('Love');
    expect(normalizeEmotion('Sorpresa')).toBe('Surprise');
  });

  it('returns null for unsupported emotions', () => {
    expect(normalizeEmotion('')).toBeNull();
    expect(normalizeEmotion('desconocido')).toBeNull();
  });

  it('normalizes and clamps confidence', () => {
    expect(normalizeConfidence(0.8)).toBe(0.8);
    expect(normalizeConfidence('0.4')).toBe(0.4);
    expect(normalizeConfidence(2)).toBe(1);
    expect(normalizeConfidence(-1)).toBe(0);
    expect(normalizeConfidence('x')).toBeNull();
  });
});
