import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: { type: "boolean" },
    },
    placeholder: {
      control: { type: "text" },
    },
    rows: {
      control: { type: "number" },
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Enter your message...",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <div>
        <label className="mb-2 block text-sm font-medium">Small (3 rows)</label>
        <Textarea rows={3} placeholder="Small textarea" />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">Medium (5 rows)</label>
        <Textarea rows={5} placeholder="Medium textarea" />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">Large (10 rows)</label>
        <Textarea rows={10} placeholder="Large textarea" />
      </div>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Textarea placeholder="Default" />
      <Textarea placeholder="Disabled" disabled />
      <Textarea placeholder="With value" defaultValue="This is some sample text that has been pre-filled in the textarea component." />
      <Textarea placeholder="Required" required />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex flex-col gap-2 w-80">
      <label htmlFor="textarea-1" className="text-sm font-medium">
        Message
      </label>
      <Textarea
        id="textarea-1"
        placeholder="Enter your message here..."
        rows={5}
      />
      <p className="text-xs text-muted-foreground">
        Please provide as much detail as possible.
      </p>
    </div>
  ),
};

