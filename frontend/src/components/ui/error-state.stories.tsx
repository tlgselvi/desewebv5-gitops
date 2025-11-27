import type { Meta, StoryObj } from "@storybook/react";
import { ErrorState, ErrorFallback } from "./error-state";

const meta = {
  title: "UI/ErrorState",
  component: ErrorState,
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
      options: ["default", "compact", "minimal"],
    },
    showRetry: {
      control: { type: "boolean" },
    },
    showHome: {
      control: { type: "boolean" },
    },
  },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Bir hata oluştu",
    message: "Lütfen daha sonra tekrar deneyin.",
  },
};

export const WithCode: Story = {
  args: {
    title: "Sunucu Hatası",
    message: "İstek işlenirken bir hata oluştu.",
    code: "500",
  },
};

export const WithActions: Story = {
  args: {
    title: "Bağlantı Hatası",
    message: "Sunucuya bağlanılamadı.",
    showRetry: true,
    showHome: true,
    onRetry: () => console.log("Retry clicked"),
    onHome: () => console.log("Home clicked"),
  },
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-sm font-semibold">Default</h3>
        <ErrorState
          title="Default Variant"
          message="This is the default card variant"
          variant="default"
        />
      </div>
      <div>
        <h3 className="mb-4 text-sm font-semibold">Compact</h3>
        <ErrorState
          title="Compact Variant"
          message="This is the compact variant"
          variant="compact"
        />
      </div>
      <div>
        <h3 className="mb-4 text-sm font-semibold">Minimal</h3>
        <ErrorState
          title="Minimal Variant"
          message="This is the minimal variant"
          variant="minimal"
        />
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-8">
      <ErrorState
        title="Small Error"
        message="This is a small error state"
        size="sm"
      />
      <ErrorState
        title="Medium Error"
        message="This is a medium error state"
        size="md"
      />
      <ErrorState
        title="Large Error"
        message="This is a large error state"
        size="lg"
      />
    </div>
  ),
};

export const ErrorFallbackExample: Story = {
  render: () => (
    <ErrorFallback
      error={new Error("Something went wrong!")}
      resetErrorBoundary={() => console.log("Reset clicked")}
    />
  ),
};

