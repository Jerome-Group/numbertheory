export function pointOnResidueCircle(index: number, count: number) {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
  return { x: 180 + 139 * Math.cos(angle), y: 180 + 139 * Math.sin(angle) };
}
