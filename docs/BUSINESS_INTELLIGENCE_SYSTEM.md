# Enterprise Business Intelligence System

## Overview
The Business Intelligence (BI) module provides advanced analytical capabilities, predicting member behaviors, evaluating operational performance, and recommending strategic interventions for the organization. This document outlines the expanded capabilities introduced in the 2026 Enterprise Upgrade.

## 1. Predictive & Strategic Analytics (Backend)

The `BusinessIntelligenceService` orchestrates data aggregation and statistical analysis via a series of specialized methods leveraging PostgreSQL window functions and real-time aggregations.

### Core Methods:
- `getCohortAnalysis(filters)`: Tracks member retention rates (3, 6, 12 months) based on signup cohorts, calculating lifetime value.
- `getFunnelAnalytics(filters)`: Measures conversion rates and pinpoints drop-offs across the Application → Active → Renewal pipeline.
- `getTrendAnalysis(filters)`: Computes statistical significance (p-values) across YoY, MoM, and QoQ metrics to differentiate noise from genuine trends.
- `getAnomalyDetection(filters)`: Utilizes Z-Scores to flag behavioral outliers (e.g., sudden spikes in churn in specific provinces).
- `getPredictiveAnalytics()`: Enhanced to return upper and lower 95% mathematical confidence intervals on 12-month projections.

### Strategic Modeling:
- `getWhatIfScenarios(scenarios)`: Projects the 12-month impact of strategic adjustments (e.g., +/- field agent deployment).
- `getROIAnalysis(filters)`: Connects marketing API spend (e.g., SMS campaigns) to acquired/renewed members to calculate Customer Acquisition Cost (CAC) and ROI percentages.
- `getResourceOptimization(filters)`: Analyzes admin workflow throughput to suggest optimal resource reallocation to eliminate bottlenecks.

## 2. Executive Summaries & Critical Insights
The `getExecutiveSummary()` method analyzes all underlying data to produce **Critical Insights**.
Instead of passive observations, the system now surfaces explicit, prioritized directives including:
- **Title & Urgency:** (Critical, High, Medium, Low)
- **Action Item:** A specific, programmatic recommendation (e.g., "Launch localized SMS campaign").
- **Assigned Owner:** The role responsible for executing the action.
- **Deadline:** Time sensitivity constraint.
- **Estimated Impact:** Quantifiable projected outcome (e.g., "Prevent 40% churn").

## 3. Data Quality & Confidence
All insights are governed by a `DataQualityMetrics` engine that evaluates database completeness (missing phones, emails, IDs). It generates a global Confidence Score, ensuring leaders know the statistical validity of the dashboard's recommendations.

## 4. Frontend Visualizations
The React dashboard (`BusinessIntelligenceDashboard.tsx`) utilizes `Recharts` to render these insights interactively:
- **Cohort Retention Matrix:** A heatmap displaying the decay and loyalty of signup cohorts over time.
- **Funnel Visualization:** A descending bar chart highlighting the most severe bottlenecks in the acquisition pipeline.
- **Strategic Planning Lab:** Interactive scenario tools allowing leaders to model hypothetical shifts and evaluate active campaign returns.

## API Integration
The primary endpoint supporting this ecosystem is located within `/api/v1/analytics/business-intelligence`. It handles role-based parameter filtering, ensuring metrics are scoped appropriately (e.g., Provincial Admins only see data for their jurisdiction, unless restricted altogether via Sidebar rules).
