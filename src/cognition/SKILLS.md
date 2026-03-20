# Skills module (level: Senior = 4)

## Available tools (all levels)
- sql_query_tool         # read-only queries on analytics warehouse
- python_sandbox         # pandas, numpy, scipy, matplotlib
- dashboard_read         # read existing dashboards
- jira_read              # read tickets and KPIs
- think_tool             # structured reasoning before action

## Available tools (level >= 3: mid+)
- dashboard_write        # create/edit dashboards
- experiment_read        # read A/B test configs and results
- data_catalog_write     # update metric definitions

## Available tools (level >= 4: senior+)
- experiment_design      # create new A/B tests
- alert_configure        # set metric monitoring alerts
- production_data_write  # write to production tables (with backup check)

## Skill notes
- Always use think_tool before any write operation
- sql_query_tool: max 10M row scan per query without explicit approval
- python_sandbox: no network access, no file system writes outside /workspace