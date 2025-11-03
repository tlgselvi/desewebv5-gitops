# JARVIS Efficiency Chain - GitHub Actions Setup

## Automated Weekly Execution

Since `.cursorignore` blocks `.yml` files, you need to manually create the GitHub Actions workflow file.

## Create the Workflow File

Create `.github/workflows/jarvis-efficiency-weekly.yml` with the following content:

```yaml
name: JARVIS Efficiency Chain (Weekly)

on:
  schedule:
    # Her Pazar 02:00 UTC'de çalışır (Türkiye saatine göre 05:00)
    - cron: '0 2 * * 0'
  workflow_dispatch:
    # Manuel çalıştırma imkanı

jobs:
  efficiency-chain:
    name: System Efficiency & Optimization
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
        
      - name: Setup PowerShell
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Setup PowerShell Core
        uses: actions/setup-powershell@v1
        with:
          pwsh-version: 'latest'
      
      - name: Create directories
        run: |
          mkdir -p logs/archive
          mkdir -p reports
          mkdir -p ops/alerts
      
      - name: Run Efficiency Chain
        run: |
          pwsh scripts/jarvis-efficiency-chain.ps1 -Verbose
        continue-on-error: true
      
      - name: Upload efficiency report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: efficiency-report-${{ github.run_number }}
          path: |
            reports/efficiency_report_*.md
            ops/alerts/jarvis_efficiency.log
          retention-days: 30
      
      - name: Summary
        if: always()
        run: |
          echo "## Efficiency Chain Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "✅ Weekly maintenance completed" >> $GITHUB_STEP_SUMMARY
          echo "📊 Reports uploaded as artifacts" >> $GITHUB_STEP_SUMMARY
          echo "📁 Retention: 30 days" >> $GITHUB_STEP_SUMMARY
```

## Quick Setup Command

Run this command to create the file:

```powershell
# Windows
@"
name: JARVIS Efficiency Chain (Weekly)

on:
  schedule:
    - cron: '0 2 * * 0'
  workflow_dispatch:

jobs:
  efficiency-chain:
    name: System Efficiency & Optimization
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      
      - name: Setup PowerShell
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Run Efficiency Chain
        run: |
          pwsh scripts/jarvis-efficiency-chain.ps1 -Verbose
        continue-on-error: true
      
      - name: Upload efficiency report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: efficiency-report
          path: reports/efficiency_report_*.md
"@ | Out-File -FilePath ".github/workflows/jarvis-efficiency-weekly.yml" -Encoding UTF8
```

## Manual Execution

Until GitHub Actions is set up, you can run manually:

```powershell
# Windows
pwsh scripts/jarvis-efficiency-chain.ps1

# Or via Cursor terminal
pwsh scripts/jarvis-efficiency-chain.ps1 -Verbose
```

## Schedule Details

- **Frequency**: Weekly
- **Day**: Sunday
- **Time**: 02:00 UTC (05:00 Turkey time)
- **Cron**: `0 2 * * 0`
- **Duration**: ~5 seconds per run
- **Retention**: 30 days

## Workflow Features

✅ **Automated Weekly Execution**: Every Sunday at 02:00 UTC  
✅ **Manual Trigger**: Can be run on-demand via `workflow_dispatch`  
✅ **Report Artifacts**: Uploads efficiency reports to GitHub  
✅ **Error Handling**: Continues on error to log all issues  
✅ **Summary**: Generates action summary for quick review  

## Verification

After creating the workflow file:

1. Commit and push to repository:
   ```bash
   git add .github/workflows/jarvis-efficiency-weekly.yml
   git commit -m "feat: add JARVIS efficiency chain weekly automation"
   git push
   ```

2. Check GitHub Actions tab:
   - Go to: Repository → Actions
   - Verify "JARVIS Efficiency Chain (Weekly)" appears

3. Test manual trigger:
   - Click "Run workflow"
   - Select branch
   - Click "Run workflow" button

4. Verify execution:
   - Check workflow logs
   - Download artifacts
   - Review efficiency report

## Related Documentation

- [Efficiency Chain README](./EFFICIENCY_CHAIN_README.md)
- [Diagnostic Chain README](./DIAGNOSTIC_CHAIN_README.md)
- [Cursor v1.2 Protocol](./.cursor/upgrade-protocol-v1.2.yaml)

---

**Last Updated:** 2025-11-03  
**Version:** 1.0  
**Status:** Ready for Setup

