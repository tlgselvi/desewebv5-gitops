import type { Meta, StoryObj } from "@storybook/react";

import { HealthCheckPanel } from "./health-check-panel";

const meta = {
  title: "MCP/HealthCheckPanel",
  component: HealthCheckPanel,
  parameters: {
    layout: "centered",
  },
  args: {
    serviceName: "MuBot API",
    status: "Stabil",
    lastChecked: "Az önce",
  },
  argTypes: {
    status: {
      control: { type: "select" },
      options: ["Stabil", "Kesinti Var", "İzleniyor", "Bilinmiyor"],
    },
  },
} satisfies Meta<typeof HealthCheckPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Stable: Story = {};

export const Down: Story = {
  args: {
    serviceName: "Forecast Engine",
    status: "Kesinti Var",
    lastChecked: "2 dk önce",
  },
};

export const Monitoring: Story = {
  args: {
    serviceName: "Kyverno Sync",
    status: "İzleniyor",
    lastChecked: "1 dk önce",
  },
};

export const Unknown: Story = {
  args: {
    serviceName: "Bilinmeyen Servis",
    status: "??",
    lastChecked: "Bilinmiyor",
  },
};


