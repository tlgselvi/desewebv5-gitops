# DESE JARVIS Efficiency Chain Documentation

## Overview

The **JARVIS Efficiency Chain** is a weekly maintenance automation that optimizes the Cursor AI development environment by:
- Cleaning old context entries
- Archiving logs
- Auditing MCP connectivity
- Benchmarking LLM models
- Generating context statistics reports
- Pushing metrics to Prometheus

## YAML Configuration (Reference)

> **Note:** The actual `.yaml` file cannot be created due to `.cursorignore` restrictions. This documentation serves as the specification.

```yaml
# jarvis-efficiency-chain.yaml
# DESE JARVIS — System Efficiency & Optimization Chain
# Amaç: Cursor, Docker MCP ve AI context ortamını otomatik optimize etmek.

meta:
  version: 1.0
  compatible_with: "upgrade-protocol-v1.2"
  safe_mode: true

chain:
  name: jarvis-efficiency
  schedule: weekly
  autoCommit: false

  steps:
    - name: Context Cleanup
      description: "3 günden eski context kayıtlarını sil."
      command: cursor context prune --older-than 3d

    - name: Log Archive
      description: "Cursor loglarını sıkıştır ve arşivle."
      command: |
        mkdir -p logs/archive
        tar -czf logs/archive/$(date +%Y%m%d)_cursor_logs.tar.gz logs/
        find logs/ -type f -mtime +3 -delete

    - name: MCP Connectivity Audit
      description: "Tüm MCP sunucularının sağlık durumunu denetle."
      command: cursor mcp ping --all

    - name: LLM Benchmark
      description: "Aktif modelleri kıyasla (GPT-5, Claude 3.5, Composer)."
      command: cursor model benchmark --compare gpt-5 claude-3.5 composer

    - name: Context Stats Report
      description: "Token, context, latency metriklerini raporla."
      command: cursor context stats --output reports/context_stats_$(date +%Y%m%d).md

    - name: Metrics Push
      description: "Prometheus MCP'ye metrikleri gönder."
      command: cursor chain metrics push jarvis-efficiency

alerts:
  on_failure:
    - notify: "admin@desehavuz.com"
    - log_to: "ops/alerts/jarvis_efficiency.log"
```

## PowerShell Implementation

Since `.yaml` files are blocked, the chain is implemented as `scripts/jarvis-efficiency-chain.ps1`.

### Usage

```powershell
# Run the efficiency chain manually
pwsh scripts/jarvis-efficiency-chain.ps1

# Run with verbose output
pwsh scripts/jarvis-efficiency-chain.ps1 -Verbose

# Specify custom output path
pwsh scripts/jarvis-efficiency-chain.ps1 -OutputPath "custom/report.json"
```

### Implementation Steps

The PowerShell script performs the following tasks:

1. **Context Cleanup**: Removes old context files from `.cursor/` directory
2. **Log Archive**: Compresses and archives logs older than 3 days
3. **MCP Connectivity Audit**: Checks health of all MCP servers (FinBot, MuBot, Dese)
4. **LLM Benchmark**: (Placeholder) Compares model performance
5. **Context Stats Report**: Generates statistics report
6. **Metrics Push**: Sends metrics to Prometheus endpoint

## Safety Notes

- **Safe Mode**: This chain only performs maintenance tasks
- **No Code Changes**: Does not modify production code
- **Graceful Failures**: MCP failures are logged but don't stop execution
- **Non-Destructive**: Logs are archived, not deleted permanently

## Schedule

- **Frequency**: Weekly
- **Auto-commit**: Disabled (manual review required)
- **Run Time**: Sunday 02:00 (suggested)

## Output

Reports are saved to:
- `reports/efficiency/efficiency_report_YYYYMMDD.md`
- `logs/archive/YYYYMMDD_cursor_logs.tar.gz`
- `ops/alerts/jarvis_efficiency.log` (if failures occur)

## Manual Execution

To run the chain manually:

```powershell
# Windows PowerShell
pwsh scripts/jarvis-efficiency-chain.ps1

# Or via Cursor AI (when implemented)
cursor chain run jarvis-efficiency
```

## Troubleshooting

### MCP Connectivity Issues

If MCP servers are unreachable:
1. Check if MCP containers are running: `docker ps | grep mcp`
2. Verify health endpoints: `curl http://localhost:5555/health`
3. Check logs: `ops/alerts/jarvis_efficiency.log`

### Context Pruning Issues

If context cleanup fails:
1. Check file permissions on `.cursor/` directory
2. Verify disk space: `df -h` (Linux) or `Get-Volume` (Windows)
3. Review last cleanup timestamp in report

### LLM Benchmark Not Found

The `cursor model benchmark` command is a placeholder for future implementation. Currently, this step is skipped with a warning.

## Related Documentation

- [DESE JARVIS Diagnostic Chain](./DIAGNOSTIC_CHAIN_README.md)
- [Cursor v1.2 Upgrade Protocol](./.cursor/upgrade-protocol-v1.2.yaml)
- [DESE JARVIS Activation Status](./.cursor/ACTIVATE.md)

## Changelog

### v1.0 (2025-11-03)
- Initial implementation as PowerShell script
- Basic context cleanup and log archiving
- MCP health checks
- Context statistics generation
- Prometheus metrics push

---

**Last Updated:** 2025-11-03  
**Version:** 1.0  
**Status:** Active

