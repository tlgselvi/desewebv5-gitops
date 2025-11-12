import type { Meta, StoryObj } from "@storybook/react";
import { Cpu, ArrowDownRight, Hourglass } from "lucide-react";

import { MetricCard } from "./metric-card";

const meta = {
  title: "MCP/MetricCard",
  component: MetricCard,
  parameters: {
    layout: "centered",
  },
  args: {
    icon: Cpu,
    title: "Gelir Tahmini",
    value: "382K ₺",
    change: "+3.4%",
    changeType: "increase",
    footerText: "Son 30 gün",
  },
  argTypes: {
    icon: {
      control: false,
      description: "Kartın başlığında gösterilecek Lucide ikon bileşeni",
    },
    changeType: {
      control: { type: "inline-radio" },
      options: ["increase", "decrease", "neutral"],
    },
  },
} satisfies Meta<typeof MetricCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Increase: Story = {};

export const Decrease: Story = {
  args: {
    icon: ArrowDownRight,
    title: "Operasyonel Gider",
    value: "142K ₺",
    change: "-1.8%",
    changeType: "decrease",
    footerText: "Aynı dönem geçen ay",
  },
};

export const Neutral: Story = {
  args: {
    icon: Hourglass,
    title: "Bekleyen İşler",
    value: "24",
    change: undefined,
    changeType: "neutral",
    footerText: "Kuyruktaki toplam görev",
  },
};


