const AVATAR_COLORS = ["#8b5cf6", "#f43f5e", "#22d3a5", "#fbbf24", "#38bdf8", "#fb923c", "#e879f9"];

export function avatarColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initials(name) {
  return (name || "?").trim().slice(0, 2).toUpperCase();
}
