"use client";

import { useEffect } from "react";

interface BuildVersionConsoleProps {
  buildVersion: string;
  builtAt: string;
}

export function BuildVersionConsole({ buildVersion, builtAt }: BuildVersionConsoleProps) {
  useEffect(() => {
    console.info("[site] build info", { buildVersion, builtAt });
  }, [buildVersion, builtAt]);

  return null;
}
