export function getAgentPort(): number {
  if (typeof window !== "undefined") {
    return parseInt(localStorage.getItem("WAKEUP_AGENT_PORT") || "3131", 10);
  }
  return 3131;
}

export function getAgentUrl(path: string): string {
  const isLocal = typeof window !== "undefined" && 
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (isLocal) {
    return `/api/machine${cleanPath}`;
  } else {
    const port = getAgentPort();
    return `https://local.wakeup.com:${port}${cleanPath}`;
  }
}
