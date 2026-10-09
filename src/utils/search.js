// make a safe case-insensitive regex from the ?search= text
// (special characters like . * ( are escaped so the user can't send a regex)
// a RegExp object is used instead of { $regex } so mongoose sanitizeFilter
// does not block it
export function searchRegex(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  const escaped = text.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}
