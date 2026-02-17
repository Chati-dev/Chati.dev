---
id: qa-impl-performance-test
agent: qa-implementation
trigger: qa-impl-regression-check
phase: build
requires_input: false
parallelizable: false
outputs: [performance-report.yaml]
handoff_to: qa-impl-verdict
autonomous_gate: false
criteria:
  - Performance benchmarks executed
  - All metrics within acceptable thresholds
  - No significant performance degradation
---

# Performance Benchmarking

## Purpose
Execute performance benchmarks to measure CLI startup time, agent execution time, file operations, and memory usage, ensuring the system meets performance requirements and has not degraded.

## Prerequisites
- test-results.yaml with PASS status
- sast-report.yaml with no blocking vulnerabilities
- regression-report.yaml with PASS status
- Performance baseline from previous release (if available)
- Benchmark suite configured

## Steps

1. **Establish or Load Performance Baseline**
   - Check for existing baseline: `.chati/performance-baseline.yaml`
   - If first release, current results become baseline
   - If baseline exists, load expected performance metrics
   - Document baseline version, environment (Node version, OS, hardware)

2. **Define Performance Metrics**
   - **CLI Startup Time**: Time from `npx chati-dev` invocation to first output
   - **Agent Execution Time**: Time per agent task (avg, p50, p95, p99)
   - **File Operations**: Read/write time for session.yaml, config.yaml
   - **YAML Parsing**: Time to parse task definitions, config files
   - **Memory Usage**: Peak memory during CLI execution, agent workflows
   - **State Operations**: Time for state read, write, validation

3. **Prepare Benchmark Environment**
   - Clear system cache: `sync && echo 3 > /proc/sys/vm/drop_caches` (Linux) or equivalent
   - Ensure consistent system load (no other intensive processes)
   - Use same Node version as baseline
   - Use representative test data (medium-sized project config)

4. **Execute CLI Startup Benchmarks**
   - Run: `hyperfine --warmup 3 --runs 10 'npx chati-dev --help'`
   - Measure time to first output
   - Measure time to full command completion
   - Test multiple commands: help, status, init
   - Calculate mean, median, standard deviation

5. **Execute Agent Workflow Benchmarks**
   - Run complete greenfield workflow, measure total time and per-agent time
   - Run complete brownfield workflow
   - Measure handoff overhead (transition time between agents)
   - Calculate agent execution time distribution (avg, p50, p95, p99)

6. **Execute File Operation Benchmarks**
   - Benchmark session.yaml read (cold and warm cache)
   - Benchmark session.yaml write (atomic write with backup)
   - Benchmark config.yaml read and merge
   - Benchmark task definition loading (all .md files in chati.dev/tasks/)
   - Measure filesystem sync overhead

7. **Execute YAML Parsing Benchmarks**
   - Parse various YAML file sizes (small: 1KB, medium: 10KB, large: 100KB)
   - Measure frontmatter extraction time
   - Measure schema validation time
   - Compare against baseline parser performance

8. **Measure Memory Usage**
   - Monitor peak memory during CLI startup
   - Monitor peak memory during agent workflow execution
   - Track memory growth over long-running operations
   - Identify memory leaks (if memory doesn't stabilize)

9. **Execute State Operation Benchmarks**
   - Measure state read time (cold and warm)
   - Measure state write time (with atomic operation)
   - Measure consistency validation time
   - Measure concurrent access handling overhead (if applicable)

10. **Compare Against Baseline and Thresholds**
    - **CLI Startup**: < 500ms acceptable, < 200ms excellent
    - **Agent Execution**: < 2s per agent acceptable, < 1s excellent
    - **File Operations**: < 50ms per operation acceptable, < 20ms excellent
    - **Memory Usage**: < 300MB peak acceptable, < 150MB excellent
    - **Degradation Threshold**: < 10% slower than baseline acceptable

11. **Identify Performance Bottlenecks**
    - Use profiling if performance is below threshold
    - Identify slow functions with `node --prof` or `clinic.js`
    - Highlight I/O-bound vs CPU-bound operations
    - Suggest optimization strategies

12. **Compile Performance Report**
    - Summarize all benchmark results
    - Compare against baseline and thresholds
    - Flag performance regressions
    - Provide optimization recommendations
    - Update baseline if performance improvements

## Decision Points

- **First Release (No Baseline)**: If this is the first release, establish baseline from current results. Set status to PASS with note "Baseline established." Ensure future releases compare against this baseline.

- **Minor Performance Degradation (5-10%)**: If performance is 5-10% slower than baseline, classify as WARNING. Acceptable if new features added or security fixes applied. Document justification.

- **Hardware Variation**: If benchmarks run on different hardware than baseline, note in report. Consider normalizing results or re-establishing baseline for consistency.

## Error Handling

**Missing Baseline**
- If baseline is missing but not first release, log warning
- Attempt to establish baseline from previous release tag
- If unavailable, treat as first release
- Flag for review to ensure performance tracking continuity

**Benchmark Execution Failure**
- If hyperfine or benchmark tool fails, attempt manual timing with `time` command
- If manual timing fails, log error and skip performance testing
- Mark performance status as UNKNOWN
- Recommend fixing benchmark tooling for future releases

**Inconsistent Results (High Variance)**
- If standard deviation is >20% of mean, results are unreliable
- Possible causes: system load, thermal throttling, background processes
- Recommend re-running benchmarks in controlled environment
- If variance persists, investigate non-deterministic code paths

**Profiling Tool Unavailable**
- If performance is below threshold but profiling tools unavailable, provide general optimization guidance
- Recommend installing clinic.js, 0x, or node --prof for detailed analysis
- Flag for manual performance investigation

## Output Format

```yaml
# performance-report.yaml
version: 1.0.0
created: YYYY-MM-DD
agent: qa-implementation
phase: build

baseline:
  version: 1.0.0
  date: YYYY-MM-DD
  source: .chati/performance-baseline.yaml
  environment:
    node_version: 22.2.0
    os: darwin
    cpu: Apple M2
    memory: 16GB
  status: LOADED # or ESTABLISHED, MISSING

current_environment:
  node_version: 22.2.0
  os: darwin
  cpu: Apple M2
  memory: 16GB
  consistent_with_baseline: true

summary:
  status: PASS # PASS, FAIL, WARNING
  within_thresholds: true
  degradation_detected: false
  improvements_detected: true
  overall_delta: -5.2% # negative = faster

cli_startup:
  command: npx chati-dev --help
  metric: time_to_first_output
  runs: 10
  warmup: 3

  baseline: 280ms
  current:
    mean: 265ms
    median: 263ms
    std_dev: 12ms
    min: 251ms
    max: 289ms
  delta: -5.4% # faster
  status: PASS
  threshold: 500ms
  assessment: "Excellent, within threshold"

  additional_commands:
    - command: npx chati-dev status
      current_mean: 312ms
      baseline: 325ms
      delta: -4.0%
      status: PASS

    - command: npx chati-dev init (dry-run)
      current_mean: 423ms
      baseline: 445ms
      delta: -4.9%
      status: PASS

agent_workflow:
  workflow: greenfield_complete
  agents: [greenfield-wu, brief, detail, architect, ux, phases, tasks, qa-planning]
  metric: total_execution_time

  baseline: 18.5s
  current:
    total: 17.2s
    per_agent:
      greenfield_wu: 1.8s
      brief: 2.1s
      detail: 2.5s
      architect: 3.2s
      ux: 2.0s
      phases: 1.9s
      tasks: 2.4s
      qa_planning: 1.3s
    handoff_overhead: 0.4s # total time spent in transitions
  delta: -7.0% # faster
  status: PASS

  per_agent_stats:
    mean: 2.15s
    median: 2.05s
    p95: 3.1s
    p99: 3.2s
  baseline_mean: 2.31s
  delta_mean: -6.9%
  threshold: 2s per agent (acceptable)
  assessment: "Mean slightly above threshold but improvement over baseline"

file_operations:
  session_yaml_read:
    baseline: 15ms
    current:
      mean: 14ms
      cold_cache: 18ms
      warm_cache: 12ms
    delta: -6.7%
    status: PASS
    threshold: 50ms

  session_yaml_write:
    baseline: 32ms
    current:
      mean: 35ms
      includes: [atomic_write, backup, fsync]
    delta: +9.4%
    status: WARNING # approaching 10% threshold
    threshold: 50ms
    note: "Slightly slower due to added backup step (security improvement)"

  config_yaml_read:
    baseline: 12ms
    current:
      mean: 11ms
    delta: -8.3%
    status: PASS
    threshold: 50ms

  task_definitions_load:
    count: 35 files
    baseline: 145ms
    current:
      mean: 138ms
    delta: -4.8%
    status: PASS
    threshold: 200ms

yaml_parsing:
  small_file_1kb:
    baseline: 2.1ms
    current: 2.0ms
    delta: -4.8%
    status: PASS

  medium_file_10kb:
    baseline: 8.5ms
    current: 10.2ms
    delta: +20.0%
    status: FAIL # >10% threshold
    note: "Regression identified in regression-report.yaml (REG-003), yaml@2.3.4 slower"

  large_file_100kb:
    baseline: 78ms
    current: 92ms
    delta: +17.9%
    status: FAIL # >10% threshold
    note: "Consistent with medium file regression"

  frontmatter_extraction:
    baseline: 1.8ms
    current: 1.7ms
    delta: -5.6%
    status: PASS

  schema_validation:
    baseline: 5.2ms
    current: 5.0ms
    delta: -3.8%
    status: PASS

memory_usage:
  cli_startup:
    baseline: 45MB
    current: 43MB
    delta: -4.4%
    status: PASS
    threshold: 150MB

  agent_workflow:
    baseline: 128MB
    current: 135MB
    delta: +5.5%
    status: PASS
    threshold: 300MB
    note: "Slight increase within acceptable range"

  peak_memory:
    baseline: 142MB
    current: 148MB
    delta: +4.2%
    status: PASS
    threshold: 300MB

  memory_leak_check:
    status: PASS
    note: "Memory stabilized after workflow completion, no leak detected"

state_operations:
  state_read:
    baseline: 18ms
    current:
      mean: 17ms
      cold_cache: 21ms
      warm_cache: 15ms
    delta: -5.6%
    status: PASS

  state_write:
    baseline: 35ms
    current:
      mean: 38ms
      includes: [atomic_write, validation]
    delta: +8.6%
    status: PASS
    note: "Added consistency validation increases time but improves reliability"

  consistency_validation:
    baseline: 8ms
    current: 9ms
    delta: +12.5%
    status: WARNING # >10% threshold
    note: "Enhanced validation adds checks, acceptable trade-off for data integrity"

threshold_compliance:
  cli_startup:
    threshold: 500ms
    current: 265ms
    status: PASS
    margin: 235ms (47% under threshold)

  agent_execution:
    threshold: 2s per agent
    current_mean: 2.15s
    status: ACCEPTABLE # slightly over but improved from baseline
    margin: -0.15s

  file_operations:
    threshold: 50ms
    max_current: 35ms (session.yaml write)
    status: PASS
    margin: 15ms (30% under threshold)

  memory_usage:
    threshold: 300MB
    current_peak: 148MB
    status: PASS
    margin: 152MB (51% under threshold)

regressions:
  - metric: YAML parsing (medium and large files)
    severity: MEDIUM
    baseline: 8.5ms (10KB), 78ms (100KB)
    current: 10.2ms (10KB), 92ms (100KB)
    delta: +20.0%, +17.9%
    root_cause: "yaml@2.3.4 upgrade for security fix (DEP-001)"
    impact: "Noticeable on large projects with many YAML files"
    recommendation: "Accept trade-off (security > performance) or explore alternative parser (js-yaml)"
    accepted: true
    justification: "Security fix takes precedence, performance still acceptable"

  - metric: Consistency validation
    severity: LOW
    baseline: 8ms
    current: 9ms
    delta: +12.5%
    root_cause: "Enhanced validation with additional checks"
    impact: "Negligible, only 1ms increase"
    recommendation: "Accept, validation improvements worth minor overhead"
    accepted: true

improvements:
  - metric: CLI startup
    delta: -5.4%
    reason: "Optimized dependency loading, lazy imports"

  - metric: Agent workflow
    delta: -7.0%
    reason: "Improved agent task caching, reduced redundant file reads"

  - metric: File operations (reads)
    delta: -6.7%
    reason: "Better caching strategy for frequently accessed files"

bottlenecks:
  identified: []
  note: "No significant bottlenecks detected, all metrics within acceptable ranges"

optimization_recommendations:
  - priority: LOW
    area: YAML parsing
    current: 10.2ms for 10KB files
    recommendation: "Evaluate js-yaml as alternative to yaml package (may be faster)"
    estimated_improvement: 10-15%
    effort: 4-6 hours
    risk: LOW

  - priority: LOW
    area: Agent execution (mean 2.15s)
    current: Slightly above 2s threshold
    recommendation: "Profile architect agent (3.2s, slowest), optimize complex computations"
    estimated_improvement: 5-10%
    effort: 2-4 hours
    risk: LOW

assessment:
  status: PASS
  rationale: |
    - All metrics within defined thresholds
    - Overall performance improved (-5.2% faster)
    - Two minor regressions (YAML parsing, validation) accepted with justification
    - Regressions are intentional trade-offs for security and reliability
    - No critical bottlenecks identified

  highlights:
    - CLI startup improved by 5.4%
    - Agent workflow improved by 7.0%
    - Memory usage improved by 4.4%
    - No memory leaks detected

  concerns:
    - YAML parsing 20% slower (accepted for security)
    - Agent mean execution slightly over 2s threshold (acceptable, improved from baseline)

  recommendations:
    - Current performance acceptable for release
    - Consider YAML parser alternatives in future optimization phase
    - Monitor agent execution time in production, optimize if user complaints

baseline_update:
  required: true
  reason: "Overall performance improved, establish new baseline"
  metrics_to_update:
    - CLI startup: 265ms (was 280ms)
    - Agent workflow: 17.2s (was 18.5s)
    - YAML parsing: Accept new values as baseline (with yaml@2.3.4)
    - Memory: 148MB peak (was 142MB, acceptable increase)

next_steps:
  - Update performance baseline with improved metrics
  - Proceed to qa-impl-verdict (performance gate PASSED)
  - Monitor performance in production after release
  - Schedule optimization phase for YAML parsing if user impact observed

handoff:
  to: qa-impl-verdict
  status: PASS
  performance_cleared: true
  notes: "All performance metrics within thresholds, ready for final QA verdict"
```
