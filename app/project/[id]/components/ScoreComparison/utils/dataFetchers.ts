import { ModelSelection, ModelResultData, SHOT_TYPE_MAP, TEMPLATE_MAP } from "@/app/types";

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
    // Convert UI enums to API-friendly values
    const shotType = SHOT_TYPE_MAP[model.option];
    const formatType = TEMPLATE_MAP[model.format];

    // Use the model value for API calls, not the display name
    const modelValue = model.model;

    // Build the API URL with all filter parameters
    let url = `/api/projects/${projectId}/model-results?model=${encodeURIComponent(modelValue)}&option=${encodeURIComponent(shotType)}&format=${encodeURIComponent(formatType)}`;

    // Add provider if available
    if (model.provider) {
      url += `&provider=${encodeURIComponent(model.provider)}`;
    }

    // Always include project type parameter if it's defined
    if (projectType) {
      url += `&projectType=${encodeURIComponent(projectType)}`;
    }

    // Add perturbation types if selected (convert array to comma-separated string)
    if (selectedPerturbations && selectedPerturbations.length > 0) {
      url += `&perturbationType=${encodeURIComponent(selectedPerturbations.join(','))}`;
    }

    // Add raw=true to get all results without deduplication
    url += '&all=true&raw=true';

    // console.log("Fetching from API URL:", url);
    const response = await fetch(url);
    const data = await response.json();

    // Handle 404 errors gracefully - return empty array instead of throwing
    if (response.status === 404) {
      // console.log(`No data found for ${model.modelDisplay || model.model} with the selected filters: ${data.error}`);
      return [];
    }

    if (!response.ok) {
      console.error("API Error:", data.error);
      throw new Error(data.error || `Error fetching results: ${response.status}`);
    }

    // Check if we got raw results directly or need to extract them
    const rawResults = data.rawResults || data.results || [];

    if (rawResults.length === 0) {
      // console.log(`No data found for ${model.modelDisplay || model.model} with the selected filters`);
      return [];
    }

    // Sort results by date (newest first)
    const sortedResults = [...rawResults].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || a.timestamp || 0);
      const dateB = new Date(b.createdAt || b.created_at || b.timestamp || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // Create a separate entry for each result with date-based names
    const processedResults: ModelResultData[] = [];

    sortedResults.forEach((result, index) => {
      // Use the display name from ModelSelection if available, otherwise fall back to model value
      const displayName = model.modelDisplay || model.model;

      // Get the date from the result
      const createdDate = new Date(result.createdAt || result.created_at || result.timestamp || 0);

      // No version suffix in the model name - just use the display name
      processedResults.push({
        model: displayName,
        modelValue: model.model, // Store original model value
        provider: model.provider,
        option: model.option,
        format: model.format,
        results: result.results,
        perturbationTypes: selectedPerturbations || [],
        raw: result,
        // Add timestamp to make it available in other components if needed
        timestamp: createdDate
      });
    });

    return processedResults;
  } catch (error) {
    console.error("Error fetching model results:", error);
    if (error instanceof Error &&
      (error.message.includes("No results found for project type") ||
        error.message.includes("No data available for project type"))) {
      // console.log("Handling project type error gracefully");
      return [];
    }
    return [];
  }
};