import type { Meta, StoryObj } from "@storybook/react";
import { Loading, LoadingSpinner, LoadingDots, LoadingPulse } from "./loading";

const meta = {
  title: "UI/Loading",
  component: Loading,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
    },
    variant: {
      control: { type: "select" },
      options: ["spinner", "dots", "pulse"],
    },
    fullScreen: {
      control: { type: "boolean" },
    },
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: "Yükleniyor...",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-8">
      <Loading size="sm" text="Small loading" />
      <Loading size="md" text="Medium loading" />
      <Loading size="lg" text="Large loading" />
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-8">
      <Loading variant="spinner" text="Spinner" />
      <Loading variant="dots" text="Dots" />
      <Loading variant="pulse" text="Pulse" />
    </div>
  ),
};

export const WithText: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <Loading text="Veriler yükleniyor..." />
      <Loading text="İşlem devam ediyor..." variant="dots" />
      <Loading text="Lütfen bekleyin..." variant="pulse" />
    </div>
  ),
};

export const StandaloneComponents: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-8">
      <div>
        <h3 className="mb-4 text-sm font-semibold">LoadingSpinner</h3>
        <LoadingSpinner text="Spinner component" />
      </div>
      <div>
        <h3 className="mb-4 text-sm font-semibold">LoadingDots</h3>
        <LoadingDots text="Dots component" />
      </div>
      <div>
        <h3 className="mb-4 text-sm font-semibold">LoadingPulse</h3>
        <LoadingPulse text="Pulse component" />
      </div>
    </div>
  ),
};

