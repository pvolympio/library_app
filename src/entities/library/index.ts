export { LibraryProvider, useLibrary, type LibraryContextValue } from "./model/LibraryProvider";
export { LIBRARY_STATUS_LABEL, type LibraryEntry, type LibraryStatus } from "./model/library";
export {
  saveEpubBinary,
  getEpubBinary,
  getEpubMetadata,
  hasEpubBinary,
  deleteEpubBinary,
  listStoredEpubIds,
} from "./api/epub-storage";
export { parseEpub, type ParsedEpubMetadata } from "./lib/epub-parser";
export { generateProceduralCoverSvg } from "./lib/procedural-cover";
