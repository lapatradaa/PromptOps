// app/project/[id]/components/ScoreComparison/utils/dataFetchers.ts
import { 
  ModelSelection, 
  ModelResultData, 
  SHOT_TYPE_MAP, 
  TEMPLATE_MAP, 
  TestResults, 
  OverallScore, 
  PerformanceScore 
} from "@/app/types";

/**
 * Fetches model results from the API and consolidates multiple results
 */
export const fetchModelResults = async (
  model: ModelSelection,
  projectId: string,
  projectType?: 'qa' | 'sentiment',
  selectedPerturbations?: string[]
): Promise<ModelResultData[]> => {
  try {
    const shotType = SHOT_TYPE_MAP[model.option];
    const formatType = TEMPLATE_MAP[model.format];
    const modelValue = model.model;

    let url = `/api/projects/${projectId}/model-results`
      + `?model=${encodeURIComponent(modelValue)}`
      + `&option=${encodeURIComponent(shotType)}`
      + `&format=${encodeURIComponent(formatType)}`
      + `&all=true&raw=true`;

    if (model.provider) {
      url += `&provider=${encodeURIComponent(model.provider)}`;
    }
    if (projectType) {
      url += `&projectType=${encodeURIComponent(projectType)}`;
    }
    if (selectedPerturbations?.length) {
      url += `&perturbationType=${encodeURIComponent(selectedPerturbations.join(','))}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (res.status === 404) return [];
    if (!res.ok) throw new Error(data.error || `Status ${res.status}`);

    const rawResults: any[] = data.rawResults || data.results || [];
    if (!rawResults.length) return [];

    rawResults.sort(
      (a, b) =>
        new Date(b.createdAt || b.created_at || 0).getTime() -
        new Date(a.createdAt || a.created_at || 0).getTime()
    );

    return rawResults.map((doc) => {
      // Extract timestamp
      const timestamp = new Date(doc.createdAt || doc.created_at || 0);

      // Pull fields off doc.results, with sensible defaults
      let tests: any[] = [];
      let performance_score: PerformanceScore = { overall_performance_score: 0 };
      let overall_score: OverallScore = {
        overall_total_tests: 0,
        overall_failures: 0,
        overall_failure_rate: 0,
        overall_pass: 0,
        overall_pass_rate: 0,
      };
      let robust_results: any[] = [];
      let index_scores: Record<string, number> = {};

      if (Array.isArray(doc.results)) {
        tests = doc.results;
      } else if (typeof doc.results === "object" && doc.results !== null) {
        const r = doc.results;
        tests = Array.isArray(r.tests) ? r.tests : [];
        performance_score = {
          overall_performance_score: r.performance_score?.overall_performance_score ?? 0,
          ... (r.performance_score || {})
        };
        overall_score = {
          overall_total_tests: r.overall_score?.overall_total_tests ?? 0,
          overall_failures: r.overall_score?.overall_failures ?? 0,
          overall_failure_rate: r.overall_score?.overall_failure_rate ?? 0,
          overall_pass: r.overall_score?.overall_pass ?? 0,
          overall_pass_rate: r.overall_score?.overall_pass_rate ?? 0,
        };
        robust_results = Array.isArray(r.robust_results) ? r.robust_results : [];
        index_scores =
          typeof r.index_scores === "object" && r.index_scores !== null
            ? r.index_scores
            : {};
      }

      const results: TestResults = {
        tests,
        performance_score,
        overall_score,
        robust_results,
        index_scores,
      };

      return {
        model: model.modelDisplay || model.model,
        modelValue: model.model,
        timestamp,
        provider: model.provider,
        option: model.option,
        format: model.format,
        results,
        perturbationTypes: selectedPerturbations || [],
        raw: doc,
      };
    });
  } catch (err) {
    console.error("Error fetching model results:", err);
    return [];
  }
};
