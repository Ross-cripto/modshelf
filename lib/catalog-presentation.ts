export function catalogHeading(category: string): string {
  if (category === 'All mods') return 'On the shelf';
  if (category === 'Saved') return 'Your saved shelf';
  return category;
}

export function catalogDescription(hasFilters: boolean, count: number): string {
  if (!hasFilters) return 'Community-made. Ready to explore.';
  const noun = count === 1 ? 'mod' : 'mods';
  return `${count} ${noun} to explore.`;
}
