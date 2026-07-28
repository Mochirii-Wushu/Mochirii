export interface AuthLoadGenerationState {
  current: number;
}

export function beginAuthLoadGeneration(state: AuthLoadGenerationState): number {
  state.current += 1;
  return state.current;
}

export function invalidateAuthLoadGeneration(state: AuthLoadGenerationState): void {
  state.current += 1;
}

export function isCurrentAuthLoadGeneration(
  state: AuthLoadGenerationState,
  generation: number,
): boolean {
  return state.current === generation;
}
