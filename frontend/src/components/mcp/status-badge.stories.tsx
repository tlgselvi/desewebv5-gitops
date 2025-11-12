import type { Meta, StoryObj } from "@storybook/react";

import { StatusBadge } from "./status-badge";

const meta = {
  title: "MCP/StatusBadge",
  component: StatusBadge,
  parameters: {
    layout: "centered",
  },
  args: {
    status: "resolved",
  },
  argTypes: {
    status: {
      control: { type: "select" },
      options: [
        "resolved",
        "monitoring",
        "closed",
        "critical",
        "inProgress",
        "pending",
        "default",
      ],
    },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StatusBadge status="resolved" />
      <StatusBadge status="monitoring" />
      <StatusBadge status="closed" />
      <StatusBadge status="critical" />
      <StatusBadge status="inProgress" />
      <StatusBadge status="pending" />
      <StatusBadge status="unknown" />
    </div>
  ),
};


