import { ImageResponse } from "next/og";

export const size = {
  width: 48,
  height: 48,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#1D4ED8",
          color: "#ffffff",
          fontSize: 28,
          fontWeight: 700,
          borderRadius: 12,
        }}
      >
        D
      </div>
    ),
    {
      ...size,
    },
  );
}

