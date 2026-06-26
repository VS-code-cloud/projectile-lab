/** Returns the route for the interactive lesson player. */
export function getLessonPath(lessonUid: string): string {
  return `/lesson/${lessonUid}`
}

/** Returns the route for post-lesson retrieval practice. */
export function getPracticePath(lessonUid: string): string {
  return `/lesson/${lessonUid}/practice`
}
