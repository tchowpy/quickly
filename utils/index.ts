export function formatFeedbackText({ comment = "", tags = [] }) {
  const cleanComment = comment.trim();

  // Si aucun tag
  if (!tags || tags.length === 0) {
    return cleanComment || "";
  }

  // On assemble les tags sous forme de liste naturelle
  const tagsText = tags.map(t => `- ${t}`).join("\n");

  // Si commentaire vide, on ne met que les tags
  if (!cleanComment) {
    return `Tags :\n${tagsText}`;
  }

  // Sinon on combine les deux
  return `${cleanComment}\n\nTags :\n${tagsText}`;
}