import https from "https";

export interface AgentResponse {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
  text: () => Promise<string>;
}

export function agentFetch(
  actionPath: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<AgentResponse> {
  return new Promise((resolve, reject) => {
    const urlStr = `https://local.wakeup.com:3131${
      actionPath.startsWith("/") ? actionPath : "/" + actionPath
    }`;
    const url = new URL(urlStr);

    const mergedHeaders: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers || {}),
    };

    let bodyStr = "";
    if (options.body) {
      bodyStr = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
      if (!mergedHeaders["Content-Type"]) {
        mergedHeaders["Content-Type"] = "application/json";
      }
      mergedHeaders["Content-Length"] = Buffer.byteLength(bodyStr).toString();
    }

    const reqOptions: https.RequestOptions = {
      method: options.method || "GET",
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: mergedHeaders,
      rejectUnauthorized: false, // Bypass self-signed certificate validation for local loopback agent
    };

    const req = https.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          ok: res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false,
          status: res.statusCode || 500,
          json: async () => {
            try {
              return JSON.parse(data);
            } catch (err) {
              throw new Error("Failed to parse JSON response: " + data);
            }
          },
          text: async () => data,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (bodyStr) {
      req.write(bodyStr);
    }

    req.end();
  });
}
