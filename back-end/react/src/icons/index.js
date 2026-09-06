import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";

export function AppIcon({
  icon,
  size = 20,
  color = "currentColor",
  strokeWidth = 1.5,
  className = "",
  style = {},
  ...props
}) {
  if (!icon) return null;

  return React.createElement(HugeiconsIcon, {
    icon,
    size,
    color,
    strokeWidth,
    className: `app-icon ${className}`.trim(),
    style: {
      display: "inline-block",
      verticalAlign: "middle",
      flexShrink: 0,
      ...style,
    },
    ...props,
  });
}

export default AppIcon;


export * from "./navigation";
export * from "./ecommerce";
export * from "./admin";
export * from "./actions";
export * from "./status";
