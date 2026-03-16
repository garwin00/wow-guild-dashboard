import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "linear-gradient(135deg, #131520 0%, #09090e 100%)",
          border: "3px solid #c8a96a",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 110,
        }}
      >
        ⚔️
      </div>
    ),
    size
  );
}
