"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authenticatedPost } from "@/lib/api";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

// Validation schema matching backend
const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255, "Project name must be less than 255 characters"),
  description: z.string().optional(),
  domain: z.string().url("Domain must be a valid URL"),
  targetRegion: z.string().default("Türkiye"),
  primaryKeywords: z.string().optional(), // Input will be a string
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;

export default function NewProjectPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<CreateProjectFormData>({
    name: "",
    description: "",
    domain: "",
    targetRegion: "Türkiye",
    primaryKeywords: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      // Validate form data
      const validatedData = createProjectSchema.parse(formData);

      // Call API
      await authenticatedPost<{ id: string; name: string }>("/api/v1/projects", {
        ...validatedData,
        // Split string into an array, trim whitespace, and filter out empty strings
        primaryKeywords: validatedData.primaryKeywords
          ? validatedData.primaryKeywords.split(",").map(kw => kw.trim()).filter(Boolean)
          : [],
      });

      toast.success("Project Created!", {
        description: `"${validatedData.name}" has been created successfully.`,
      });

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error("Validation Error", {
          description: "Please check the form fields and try again.",
        });
      } else {
        // Handle API errors
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to create project. Please try again.";
        toast.error("Error", {
          description: errorMessage,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Create New SEO Project
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Add a new project to track SEO performance and metrics.
        </p>
      </div>

      {/* Form */}
      <Card variant="outlined" className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Project Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="e.g., My Website SEO"
              value={formData.name}
              onChange={handleChange}
              disabled={isSubmitting}
              className={errors.name ? "border-red-500 focus:ring-red-500" : ""}
              required
            />
            {errors.name && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Domain URL */}
          <div className="space-y-2">
            <Label htmlFor="domain">
              Domain URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="domain"
              name="domain"
              type="url"
              placeholder="https://example.com"
              value={formData.domain}
              onChange={handleChange}
              disabled={isSubmitting}
              className={errors.domain ? "border-red-500 focus:ring-red-500" : ""}
              required
            />
            {errors.domain && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.domain}</p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the full URL including https://
            </p>
          </div>

          {/* Target Region */}
          <div className="space-y-2">
            <Label htmlFor="targetRegion">Target Region</Label>
            <Input
              id="targetRegion"
              name="targetRegion"
              type="text"
              placeholder="Türkiye"
              value={formData.targetRegion}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Default: Türkiye
            </p>
          </div>

          {/* Primary Keywords */}
          <div className="space-y-2">
            <Label htmlFor="primaryKeywords">Primary Keywords</Label>
            <Input
              id="primaryKeywords"
              name="primaryKeywords"
              type="text"
              placeholder="e.g., seo, digital marketing, content strategy"
              value={formData.primaryKeywords}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter keywords separated by commas.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Optional project description..."
              value={formData.description}
              onChange={handleChange}
              disabled={isSubmitting}
              rows={4}
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
