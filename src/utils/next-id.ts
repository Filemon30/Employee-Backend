export async function nextIdFromMax(
  getMax: () => Promise<number | null>
): Promise<number> {
  const maxValue = await getMax();

  return (maxValue ?? 0) + 1;
}
