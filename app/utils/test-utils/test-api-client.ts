// app/utils/test-utils/test-api-client.ts
import { Block } from "@/app/types";

export interface CreateTestOptions {
  blocks: Block[];
  shotType: string;
  template: string;
  topics: any[];
  projectId: string;
  projectType: string;
  topicConfigs?: any;
  systemPrompt?: string;
  modelProvider?: string;
  model?: string;
  apiKey?: string;
  url?: string;
}

export interface CreateTestResponse {
  testId: string;
  resultId: string;
  message: string;
}

const testApiClient = {
  async startTest(
    projectId: string,
    options: CreateTestOptions
  ): Promise<CreateTestResponse> {
    const formData = new FormData();
    formData.append("blocks", JSON.stringify(options.blocks));
    formData.append("shot_type", options.shotType);
    formData.append("template", options.template);
    formData.append("topics", JSON.stringify(options.topics));
    formData.append("project_id", projectId);
    formData.append("project_type", options.projectType)

    if (options.topicConfigs) {
      formData.append("topic_configs", JSON.stringify(options.topicConfigs));
    }
    if (options.systemPrompt) {
      formData.append("system_content", options.systemPrompt);
    }
    if (options.modelProvider) {
      formData.append("model_provider", options.modelProvider);
    }
    if (options.model) {
      formData.append("model", options.model);
    }
    if (options.apiKey) {
      formData.append("api_key", options.apiKey);
    }
    if (options.url) {
      formData.append("url", options.url);
    }

    const response = await fetch(`/api/projects/${projectId}/test`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to start test: ${text}`);
    }

    const data = (await response.json()) as any;
    return {
      testId: data.test_id,
      resultId: data.resultId ?? data.result_id ?? "",
      message: data.message,
    };
  },

  createTest(
    projectId: string,
    options: CreateTestOptions
  ): Promise<CreateTestResponse> {
    return this.startTest(projectId, options);
  },

  async abortTest(projectId: string, testId: string) {
    const response = await fetch(`/api/projects/${projectId}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-status",
        testId,
        status: "aborted",
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to abort test ${testId}`);
    }
    return response.json();
  },

  async getTestResults(projectId: string, testId: string) {
    const response = await fetch(
      `/api/projects/${projectId}/test?testId=${encodeURIComponent(testId)}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch test results");
    }
    return response.json();
  },

  async saveResults(projectId: string, results: any) {
    const res = await fetch(`/api/projects/results/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(results),
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
  },
};

export default testApiClient;
