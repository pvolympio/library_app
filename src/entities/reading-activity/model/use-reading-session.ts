import { useCallback, useEffect, useRef } from "react";
import { beginReadingSession, endReadingSession, incrementSessionPage } from "../api/reading-activity-storage";
import type { ReadingBookReference, ReadingSessionHandle } from "./reading-activity";

export function useReadingSession(book: ReadingBookReference) {
  const sessionRef = useRef<ReadingSessionHandle | null>(null);
  const lastPageRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    lastPageRef.current = null;
    void beginReadingSession(book)
      .then((session) => {
        if (active) sessionRef.current = session;
        else void endReadingSession(session);
      })
      .catch((error: unknown) => console.error("Falha ao iniciar sessao de leitura:", error));

    return () => {
      active = false;
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) void endReadingSession(session);
    };
  }, [book]);

  return useCallback((pageKey: string) => {
    if (lastPageRef.current === null) {
      lastPageRef.current = pageKey;
      return;
    }
    if (lastPageRef.current === pageKey) return;
    lastPageRef.current = pageKey;
    const session = sessionRef.current;
    if (session) incrementSessionPage(session);
  }, []);
}
