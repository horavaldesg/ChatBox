import { appUrl } from "@streamfusion/shared";

export function overlayUrl(overlayId: string, token: string, origin = appUrl()): string {
  return `${origin}/overlay/${overlayId}?token=${encodeURIComponent(token)}`;
}
