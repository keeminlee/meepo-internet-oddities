import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/constants";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${BRAND.name} — ${BRAND.subtitle}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          color: "#fafafa",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 160,
            color: "#c4b5fd",
            lineHeight: 1,
            marginBottom: 24,
          }}
        >
          ✦
        </div>
        <div
          style={{
            fontSize: 104,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          {BRAND.name}
        </div>
        <div
          style={{
            fontSize: 40,
            color: "#a3a3a3",
            marginTop: 24,
            maxWidth: 900,
          }}
        >
          {BRAND.subtitle}
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#737373",
            marginTop: 32,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {BRAND.url}
        </div>
      </div>
    ),
    { ...size },
  );
}
