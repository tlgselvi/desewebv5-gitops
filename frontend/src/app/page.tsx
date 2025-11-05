"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiMethods, getErrorMessage } from "@/api/client";
import { logger } from "@/utils/logger";
import { isAxiosError } from "axios";

interface Project {
  id: string;
  name: string;
  domain: string;
  status: string;
  targetDomainAuthority: number;
  targetCtrIncrease: number;
}

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalAnalyses: number;
  avgDomainAuthority: number;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects with error handling
        let projectsData: { projects: Project[] } = { projects: [] };
        try {
          projectsData = await apiMethods.get<{ projects: Project[] }>("/projects?status=active");
        } catch (projectsError: unknown) {
          const errorMessage = getErrorMessage(projectsError);
          logger.warn("Failed to fetch projects", {
            error: errorMessage,
            status: isAxiosError(projectsError) ? projectsError.response?.status : undefined,
          });
          // Continue with empty projects array if fetch fails
          projectsData = { projects: [] };
        }

        // Fetch health check (optional)
        let healthData: any = null;
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
          const healthResponse = await fetch(`${apiUrl.replace('/api/v1', '')}/health`, {
            headers: {
              "X-Master-Control-CLI": "true",
            },
          });
          if (healthResponse.ok) {
            healthData = await healthResponse.json();
          }
        } catch (healthError: unknown) {
          // Health check is optional, just log a warning
          logger.debug("Health check failed (non-critical)", {
            error: healthError instanceof Error ? healthError.message : String(healthError),
          });
        }

        setProjects(projectsData.projects?.slice(0, 5) || []);
        
        // Calculate stats from projects
        setStats({
          totalProjects: projectsData.projects?.length || 0,
          activeProjects: projectsData.projects?.filter(p => p.status === 'active').length || 0,
          totalAnalyses: 0,
          avgDomainAuthority: projectsData.projects?.length > 0
            ? Math.round(projectsData.projects.reduce((sum, p) => sum + (p.targetDomainAuthority || 0), 0) / projectsData.projects.length)
            : 0,
        });
      } catch (error: unknown) {
        logger.error("Error fetching dashboard data", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Set empty stats on error
        setStats({
          totalProjects: 0,
          activeProjects: 0,
          totalAnalyses: 0,
          avgDomainAuthority: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "archived":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 font-sans">Dashboard</h1>
        <p className="text-gray-600 font-sans">CPT Optimization Domain - SEO Project Overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.totalProjects || projects.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📁</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Projects</p>
              <p className="text-2xl font-bold text-green-600">
                {stats?.activeProjects || projects.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Analyses</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.totalAnalyses || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Domain Authority</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.avgDomainAuthority || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⭐</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/projects"
            className="block bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all no-underline"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">➕</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 no-underline">New Project</p>
                <p className="text-sm text-gray-600 no-underline">Create a new SEO project</p>
              </div>
            </div>
          </Link>

          <Link
            href="/seo"
            className="block bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all no-underline"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔍</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 no-underline">SEO Analysis</p>
                <p className="text-sm text-gray-600 no-underline">Run SEO analysis</p>
              </div>
            </div>
          </Link>

          <Link
            href="/aiops"
            className="block bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all no-underline"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 no-underline">AIOps Dashboard</p>
                <p className="text-sm text-gray-600 no-underline">Monitor system health</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
          <Link
            href="/projects"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium no-underline"
          >
            View All →
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500 mb-4">No projects found</p>
            <Link
              href="/projects"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors no-underline"
            >
              Create Your First Project
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain Authority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{project.domain}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          project.status
                        )}`}
                      >
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {project.targetDomainAuthority}/100
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-blue-600 hover:text-blue-900 no-underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

