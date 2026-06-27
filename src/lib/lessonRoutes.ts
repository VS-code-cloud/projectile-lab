/** Returns the route for the interactive lesson player. */
export function getLessonPath(lessonUid: string): string {
  return `/lesson/${lessonUid}`
}

/** Returns the route for post-lesson retrieval practice. */
export function getPracticePath(lessonUid: string): string {
  return `/lesson/${lessonUid}/practice`
}

/**
 * Returns the route for a lesson's retrieval practice in "review" mode, used as
 * a gate before starting the next lesson. The `next` query param tells the
 * practice page which lesson to continue to once review practice is done.
 * @param lessonUid The lesson whose practice is being reviewed (the previous lesson).
 * @param nextLessonUid The lesson to continue to after review.
 */
export function getReviewPracticePath(
  lessonUid: string,
  nextLessonUid: string,
): string {
  return `/lesson/${lessonUid}/practice?next=${encodeURIComponent(nextLessonUid)}`
}
