import { FC } from "react";
import { notFound } from "next/navigation";

interface McpModulePageProps {
  params: {
    moduleId: string;
  };
}

const McpModulePage: FC<McpModulePageProps> = ({ params }) => {
  const { moduleId } = params;

  const validModules = ["finbot", "mubot", "dese", "observability"];

  if (!validModules.includes(moduleId)) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold capitalize">MCP Module: {moduleId}</h1>
      <p>This is a placeholder page for the {moduleId} MCP module dashboard.</p>
    </div>
  );
};

export default McpModulePage;