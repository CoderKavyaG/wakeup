import https from "https";
import fs from "fs";
import path from "path";

export interface AgentResponse {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
  text: () => Promise<string>;
}

function getAgentSecret(): string | null {
  try {
    const secretPath = path.join(process.cwd(), "devos-agent", ".agent-secret");
    return fs.readFileSync(secretPath, "utf-8").trim();
  } catch {
    return null;
  }
}

export function agentFetch(
  actionPath: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<AgentResponse> {
  let activePort = 3131;
  try {
    const portFilePath = path.join(process.cwd(), "devos-agent", "active-port.json");
    if (fs.existsSync(portFilePath)) {
      const content = fs.readFileSync(portFilePath, "utf8");
      const data = JSON.parse(content);
      if (data && typeof data.port === "number") {
        activePort = data.port;
      }
    }
  } catch (e) {
    console.error("Failed to read active port, defaulting to 3131:", e);
  }

  return new Promise((resolve, reject) => {
    const urlStr = `https://local.wakeup.com:${activePort}${
      actionPath.startsWith("/") ? actionPath : "/" + actionPath
    }`;
    const url = new URL(urlStr);

    const secret = getAgentSecret();
    const mergedHeaders: Record<string, string> = {
      Accept: "application/json",
      "x-devos-agent-secret": secret || "",
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
