export default function () {
  const now = new Date();
  return {
    id: now.getTime().toString(36),
    date: now,
    iso: now.toISOString(),
  };
}
