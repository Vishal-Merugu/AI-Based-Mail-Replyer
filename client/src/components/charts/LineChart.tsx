import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";

type Point = { date: string; count: number };

export function LineChart({
  data,
  height = 200,
}: {
  data: Point[];
  height?: number;
}) {
  const theme = useTheme();
  const stroke = theme.palette.primary.main;
  const fill = theme.palette.primary.main;
  const axis = theme.palette.divider;
  const text = theme.palette.text.secondary;

  const width = Math.max(320, data.length * 24);
  const padL = 32;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const maxY = Math.max(1, ...data.map((d) => d.count));
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: padL + i * stepX,
    y: padT + innerH - (d.count / maxY) * innerH,
    d,
  }));

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  const area = `${path} L${padL + innerW},${padT + innerH} L${padL},${padT + innerH} Z`;

  // Show a tick every ~7 days when possible.
  const tickEvery = Math.max(1, Math.floor(data.length / 6));

  return (
    <Box sx={{ overflowX: "auto" }}>
      <svg width={width} height={height} role="img" aria-label="Emails per day">
        <line
          x1={padL}
          y1={padT + innerH}
          x2={padL + innerW}
          y2={padT + innerH}
          stroke={axis}
          strokeWidth={1}
        />
        <path d={area} fill={fill} fillOpacity={0.12} stroke="none" />
        <path d={path} fill="none" stroke={stroke} strokeWidth={2} />
        {points.map((p, i) =>
          i % tickEvery === 0 || i === points.length - 1 ? (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3} fill={stroke} />
              <text
                x={p.x}
                y={height - 6}
                fontSize={10}
                fill={text}
                textAnchor="middle"
              >
                {p.d.date.slice(5)}
              </text>
            </g>
          ) : null
        )}
        <text x={padL - 6} y={padT + 4} fontSize={10} fill={text} textAnchor="end">
          {maxY}
        </text>
        <text
          x={padL - 6}
          y={padT + innerH}
          fontSize={10}
          fill={text}
          textAnchor="end"
        >
          0
        </text>
      </svg>
    </Box>
  );
}
