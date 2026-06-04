import { appUrl } from "@streamfusion/shared";

export function publicOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) return `${forwardedProto.split(",")[0]}://${forwardedHost.split(",")[0]}`;

  const host = request.headers.get("host");
  if (host && !host.startsWith("0.0.0.0") && !host.startsWith("localhost")) {
    const proto = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
    return `${proto.split(",")[0]}://${host}`;
  }

  return appUrl();
}
