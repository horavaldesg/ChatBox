import { appUrl } from "@streamfusion/shared";

export function overlayUrl(overlayId: string, token: string): string {
  return `${appUrl()}/overlay/${overlayId}?token=${encodeURIComponent(token)}`;
}
