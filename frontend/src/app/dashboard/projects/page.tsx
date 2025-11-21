"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authenticatedGet } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderPlus, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Project interface matching backend response
interface Project {
  id: string;
  name: string;
  domain: string;
  targetRegion: string | null;
  status: string;
  createdAt: string;
}

interface ProjectsResponse {
  projects: Project[];
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await authenticatedGet<ProjectsResponse>("/api/v1/projects");
        setProjects(data.projects || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load projects. Please try again.";
        setError(errorMessage);
        toast.error("Error", {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const getStatusBadgeVariant = (status: string): "default" | "success" | "warning" | "secondary" => {
    switch (status?.toLowerCase()) {
      case "active":
        return "success";
      case "inactive":
        return "warning";
      case "archived":
        return "secondary";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            My Projects
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage your SEO projects and track their performance
          </p>
        </div>
        <Button variant="primary" asChild>
          <Link href="/dashboard/projects/new">
            <FolderPlus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} variant="outlined" className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20" variant="chip" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card variant="outlined" className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Failed to load projects
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                setIsLoading(true);
                window.location.reload();
              }}
            >
              <Loader2 className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && projects.length === 0 && (
        <Card variant="outlined" className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20">
              <FolderPlus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                No projects found
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
                Get started by creating your first SEO project. Track performance, manage keywords, and optimize your content.
              </p>
            </div>
            <Button variant="primary" asChild>
              <Link href="/dashboard/projects/new">
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Your First Project
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Projects Grid */}
      {!isLoading && !error && projects.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              variant="outlined"
              className="group cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600"
              onClick={() => router.push(`/dashboard/projects/${project.id}`)}
            >
              <div className="p-6 space-y-4">
                {/* Project Name */}
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <ExternalLink className="h-3 w-3" />
                    <a
                      href={project.domain}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline truncate"
                    >
                      {project.domain.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                </div>

                {/* Status and Region */}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={getStatusBadgeVariant(project.status)}>
                    {project.status || "active"}
                  </Badge>
                  {project.targetRegion && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {project.targetRegion}
                    </span>
                  )}
                </div>

                {/* Created Date */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Created {formatDate(project.createdAt)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

