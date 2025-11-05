import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface CommitData {
  hash: string;
  date: string;
  author: string;
  message: string;
  branch: string;
  files: FileChange[];
  additions: number;
  deletions: number;
  module: string[];
  eventType: string[];
}

interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  module: string;
}

function getGitLog(): string {
  try {
    return execSync(
      'git log --all --pretty=format:"%H|%ad|%an|%s|%D" --date=short --numstat --no-merges',
      { encoding: 'utf-8', cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
    );
  } catch (error) {
    console.error('Failed to get git log:', error);
    return '';
  }
}

function parseGitLog(log: string): CommitData[] {
  const commits: CommitData[] = [];
  const lines = log.split('\n');
  let currentCommit: Partial<CommitData> | null = null;
  const files: FileChange[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Check if it's a commit header (hash starts with commit hash)
    if (line.match(/^[a-f0-9]{40}\|/)) {
      // Save previous commit
      if (currentCommit) {
        const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
        const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);
        const modules = [...new Set(files.map((f) => f.module))];
        const eventTypes = detectEventTypes(currentCommit.message || '', files);

        commits.push({
          hash: currentCommit.hash || '',
          date: currentCommit.date || '',
          author: currentCommit.author || '',
          message: currentCommit.message || '',
          branch: currentCommit.branch || 'unknown',
          files: [...files],
          additions: totalAdditions,
          deletions: totalDeletions,
          module: modules,
          eventType: eventTypes,
        });

        files.length = 0;
      }

      // Parse new commit header
      const parts = line.split('|');
      if (parts.length >= 5) {
        const branchInfo = parts[4] || '';
        const branch = extractBranch(branchInfo);

        currentCommit = {
          hash: parts[0].substring(0, 8),
          date: parts[1],
          author: parts[2],
          message: parts[3],
          branch,
        };
      }
    } else if (line.match(/^\d+\s+\d+\s+/) && currentCommit) {
      // Parse file change line (additions deletions filename)
      const parts = line.split('\t');
      if (parts.length >= 3) {
        const additions = parseInt(parts[0]) || 0;
        const deletions = parseInt(parts[1]) || 0;
        const path = parts[2];
        const module = detectModule(path);

        files.push({
          path,
          additions,
          deletions,
          module,
        });
      }
    }
  }

  // Save last commit
  if (currentCommit && files.length > 0) {
    const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);
    const modules = [...new Set(files.map((f) => f.module))];
    const eventTypes = detectEventTypes(currentCommit.message || '', files);

    commits.push({
      hash: currentCommit.hash || '',
      date: currentCommit.date || '',
      author: currentCommit.author || '',
      message: currentCommit.message || '',
      branch: currentCommit.branch || 'unknown',
      files: [...files],
      additions: totalAdditions,
      deletions: totalDeletions,
      module: modules,
      eventType: eventTypes,
    });
  }

  return commits;
}

function extractBranch(branchInfo: string): string {
  const match = branchInfo.match(/HEAD -> ([^,]+)/);
  if (match) return match[1];
  const remoteMatch = branchInfo.match(/origin\/([^,]+)/);
  if (remoteMatch) return remoteMatch[1];
  return 'unknown';
}

function detectModule(path: string): string {
  if (path.includes('finbot') || path.includes('mcp/finbot')) return 'FINBOT';
  if (path.includes('mubot') || path.includes('mcp/mubot')) return 'MUBOT';
  if (path.includes('dese') || path.includes('mcp/dese')) return 'DESE';
  if (path.includes('observability') || path.includes('mcp/observability')) return 'OBSERVABILITY';
  if (path.includes('rbac') || path.includes('permissions')) return 'RBAC';
  if (path.includes('audit') || path.includes('privacy')) return 'AUDIT';
  if (path.includes('k8s') || path.includes('helm') || path.includes('docker')) return 'INFRASTRUCTURE';
  if (path.includes('test') || path.includes('.test.')) return 'TESTING';
  if (path.includes('migration') || path.includes('schema')) return 'DATABASE';
  if (path.includes('scripts') || path.includes('ops')) return 'OPS';
  return 'CORE';
}

function detectEventTypes(message: string, files: FileChange[]): string[] {
  const events: string[] = [];
  const lowerMessage = message.toLowerCase();
  const filePaths = files.map((f) => f.path);

  // New files
  if (files.some((f) => f.additions > 50 && f.deletions === 0)) {
    events.push('NEW_FILES');
  }

  // Deleted files
  if (files.some((f) => f.additions === 0 && f.deletions > 50)) {
    events.push('DELETED_FILES');
  }

  // Refactor
  if (
    lowerMessage.includes('refactor') ||
    lowerMessage.includes('cleanup') ||
    (files.length > 5 && files.every((f) => f.additions + f.deletions < 100))
  ) {
    events.push('REFACTOR');
  }

  // Infrastructure
  if (
    lowerMessage.includes('docker') ||
    lowerMessage.includes('k8s') ||
    lowerMessage.includes('kubernetes') ||
    lowerMessage.includes('helm') ||
    filePaths.some((p) => p.includes('docker') || p.includes('k8s') || p.includes('helm'))
  ) {
    events.push('INFRASTRUCTURE');
  }

  // Feature
  if (
    lowerMessage.includes('feature') ||
    lowerMessage.includes('add') ||
    lowerMessage.includes('implement')
  ) {
    events.push('FEATURE');
  }

  // Fix/Bug
  if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) {
    events.push('BUGFIX');
  }

  // Security
  if (lowerMessage.includes('security') || lowerMessage.includes('audit')) {
    events.push('SECURITY');
  }

  // Migration
  if (lowerMessage.includes('migration') || filePaths.some((p) => p.includes('migration'))) {
    events.push('MIGRATION');
  }

  return events.length > 0 ? events : ['OTHER'];
}

function groupByDate(commits: CommitData[]): Map<string, CommitData[]> {
  const grouped = new Map<string, CommitData[]>();
  for (const commit of commits) {
    const date = commit.date;
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(commit);
  }
  return grouped;
}

function detectSprint(date: string, allDates: string[]): string {
  // Simple sprint detection based on date ranges
  // You can customize this based on your sprint schedule
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const week = Math.ceil(dateObj.getDate() / 7);
  
  return `Sprint ${year}-${month.toString().padStart(2, '0')}-W${week}`;
}

function generateReport(commits: CommitData[]): string {
  const grouped = groupByDate(commits);
  const sortedDates = Array.from(grouped.keys()).sort().reverse();
  const allDates = sortedDates;

  let report = '# Repository Activity Report\n\n';
  report += `**Generated:** ${new Date().toISOString().split('T')[0]}\n`;
  report += `**Total Commits:** ${commits.length}\n`;
  report += `**Date Range:** ${sortedDates[sortedDates.length - 1]} to ${sortedDates[0]}\n\n`;

  // Executive Summary
  report += '## Executive Summary\n\n';

  const moduleStats = new Map<string, number>();
  const eventTypeStats = new Map<string, number>();
  let totalAdditions = 0;
  let totalDeletions = 0;
  let newFilesCount = 0;
  let deletedFilesCount = 0;

  for (const commit of commits) {
    commit.module.forEach((m) => {
      moduleStats.set(m, (moduleStats.get(m) || 0) + 1);
    });
    commit.eventType.forEach((e) => {
      eventTypeStats.set(e, (eventTypeStats.get(e) || 0) + 1);
    });
    totalAdditions += commit.additions;
    totalDeletions += commit.deletions;

    if (commit.eventType.includes('NEW_FILES')) newFilesCount++;
    if (commit.eventType.includes('DELETED_FILES')) deletedFilesCount++;
  }

  report += `### Code Statistics\n\n`;
  report += `- **Total Additions:** ${totalAdditions.toLocaleString()} lines\n`;
  report += `- **Total Deletions:** ${totalDeletions.toLocaleString()} lines\n`;
  report += `- **Net Change:** ${(totalAdditions - totalDeletions).toLocaleString()} lines\n`;
  report += `- **New Files Created:** ${newFilesCount} commits\n`;
  report += `- **Files Deleted:** ${deletedFilesCount} commits\n\n`;

  report += `### Module Activity\n\n`;
  const sortedModules = Array.from(moduleStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [module, count] of sortedModules) {
    const percentage = ((count / commits.length) * 100).toFixed(1);
    report += `- **${module}:** ${count} commits (${percentage}%)\n`;
  }
  report += '\n';

  report += `### Event Types\n\n`;
  const sortedEvents = Array.from(eventTypeStats.entries()).sort((a, b) => b[1] - a[1]);
  for (const [event, count] of sortedEvents) {
    const percentage = ((count / commits.length) * 100).toFixed(1);
    report += `- **${event}:** ${count} commits (${percentage}%)\n`;
  }
  report += '\n';

  // Progress Estimate
  const featureCommits = commits.filter((c) => c.eventType.includes('FEATURE')).length;
  const bugfixCommits = commits.filter((c) => c.eventType.includes('BUGFIX')).length;
  const progressEstimate = Math.min(
    100,
    Math.round((featureCommits / (featureCommits + bugfixCommits + 1)) * 100)
  );

  report += `### Business Impact Estimate\n\n`;
  report += `- **Development Progress:** ~${progressEstimate}%\n`;
  report += `- **Feature Development:** ${featureCommits} commits\n`;
  report += `- **Bug Fixes:** ${bugfixCommits} commits\n`;
  report += `- **Infrastructure Improvements:** ${
    commits.filter((c) => c.eventType.includes('INFRASTRUCTURE')).length
  } commits\n\n`;

  // Commit History by Date
  report += '## Commit History by Date\n\n';

  for (const date of sortedDates.slice(0, 50)) {
    const dateCommits = grouped.get(date) || [];
    const sprint = detectSprint(date, allDates);

    report += `### ${date} - ${sprint}\n\n`;
    report += `**Commits:** ${dateCommits.length}\n\n`;

    for (const commit of dateCommits) {
      report += `#### ${commit.hash} - ${commit.message.substring(0, 80)}\n\n`;
      report += `- **Branch:** ${commit.branch}\n`;
      report += `- **Author:** ${commit.author}\n`;
      report += `- **Changes:** +${commit.additions} / -${commit.deletions}\n`;
      report += `- **Modules:** ${commit.module.join(', ') || 'N/A'}\n`;
      report += `- **Events:** ${commit.eventType.join(', ')}\n`;

      if (commit.files.length > 0 && commit.files.length <= 20) {
        report += `- **Files Changed:**\n`;
        for (const file of commit.files.slice(0, 15)) {
          report += `  - ${file.path} (+${file.additions}/-${file.deletions}) [${file.module}]\n`;
        }
        if (commit.files.length > 15) {
          report += `  - ... and ${commit.files.length - 15} more files\n`;
        }
      } else if (commit.files.length > 20) {
        report += `- **Files Changed:** ${commit.files.length} files\n`;
      }

      report += '\n';
    }

    report += '---\n\n';
  }

  return report;
}

// Main execution
const gitLog = getGitLog();
if (!gitLog) {
  console.error('No git log found');
  process.exit(1);
}

const commits = parseGitLog(gitLog);
const report = generateReport(commits);

const outputPath = join(process.cwd(), 'reports', 'repository_activity_report.md');
writeFileSync(outputPath, report, 'utf-8');

console.log(`✅ Activity report generated: ${outputPath}`);
console.log(`📊 Processed ${commits.length} commits`);

