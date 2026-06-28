import { useEffect, useState } from "react";

export function useGridColumns() {
  const [columns, setColumns] = useState(() => {
    if (typeof window === "undefined") return 1;
    const width = window.innerWidth;
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
  });

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      setColumns(width >= 1024 ? 3 : width >= 768 ? 2 : 1);
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
}
