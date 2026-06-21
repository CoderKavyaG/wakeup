"use client";

import { useEffect } from "react";

let activeAgentPort = 3131;

export function ClientBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;

    // Fetch the active agent port on mount
    originalFetch("/api/machine-port")
      .then(r => r.json())
      .then(data => {
        if (data.port) activeAgentPort = data.port;
      })
      .catch(() => {});

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      let urlStr = "";
      if (typeof input === "string") {
        urlStr = input;
      } else if (input instanceof URL) {
        urlStr = input.href;
      } else if (input && typeof input === "object" && "url" in input) {
        urlStr = input.url;
      }

      // Check if this is a request to our machine API proxy
      if (urlStr.includes("/api/machine/")) {
        try {
          const urlObj = new URL(urlStr, window.location.origin);
          if (urlObj.pathname.startsWith("/api/machine/")) {
            const action = urlObj.pathname.substring("/api/machine/".length);
            const query = urlObj.search;

            // Map specific actions if they differ on the agent
            let targetAction = action;
            if (action === "restart-agent") {
              targetAction = "restart";
            }

            // start-agent can only be run via the local Next.js server.
            // If on a deployed website, return a mock error message explaining the issue.
            if (action === "start-agent") {
              if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
                return new Response(
                  JSON.stringify({ error: "Cannot start the agent from a cloud-deployed website. Please run the powershell command to start it." }),
                  { status: 400, headers: { "Content-Type": "application/json" } }
                );
              }
              // If on localhost, let it go to local Next.js to spawn
              return originalFetch(input, init);
            }

            try {
              // Fetch directly from the user's local agent
              const response = await originalFetch(`https://local.wakeup.com:${activeAgentPort}/${targetAction}${query}`, init);
              return response;
            } catch (err) {
              console.warn("Direct connection to local agent failed, checking if port changed...");
              try {
                const portRes = await originalFetch("/api/machine-port");
                const portData = await portRes.json();
                if (portData.port && portData.port !== activeAgentPort) {
                  activeAgentPort = portData.port;
                  console.log("Refetched agent port, retrying on new port:", activeAgentPort);
                  return await originalFetch(`https://local.wakeup.com:${activeAgentPort}/${targetAction}${query}`, init);
                }
              } catch (e) {}

              console.warn("Direct connection to local agent failed, returning offline status:", err);
              // Return a 503 response to trigger offline mode in the UI
              return new Response(
                JSON.stringify({ error: "DevOS Agent is offline." }),
                { status: 503, headers: { "Content-Type": "application/json" } }
              );
            }
          }
        } catch (e) {
          console.error("Error in machineFetch interceptor:", e);
        }
      }

      // Default fetch behaviour
      return originalFetch(input, init);
    };
  }, []);

  return null;
}
