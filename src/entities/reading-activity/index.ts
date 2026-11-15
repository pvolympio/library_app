export {
  HIGHLIGHT_COLORS,
  DEFAULT_ANNUAL_GOAL,
  isHighlightColor,
  type HighlightColor,
  type ReadingBookReference,
  type ReadingHighlight,
  type ReadingHighlightDraft,
  type DailyReadingStat,
  type ReadingStatistics,
} from "./model/reading-activity";
export { useReadingSession } from "./model/use-reading-session";
export {
  ensureReadingBook,
  isTauriRuntime,
  listReadingHighlights,
  createReadingHighlight,
  deleteReadingHighlight,
  updateReadingHighlightNote,
  markBookCompleted,
  setAnnualReadingGoal,
  loadReadingStatistics,
} from "./api/reading-activity-storage";
