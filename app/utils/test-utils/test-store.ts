// /app/utils/test-utils/test-store.ts
interface TestInfo {
    status: "running" | "processing" | "completed" | "error" | "aborted" | "not_found";
    progress?: string;
    results?: any;
    error?: string;
    startTime: Date;
    timeoutId?: NodeJS.Timeout;
    userId: string;
    projectId: string;
    abortController?: AbortController;
}

// MAX_TEST_RUNTIME acts as an application-level safeguard (30 minutes)
const MAX_TEST_RUNTIME = 30 * 60 * 1000; // 30 minutes

export const TestStore = {
    activeTests: new Map<string, TestInfo>(),

    getTest(testId: string): TestInfo | undefined {
        console.log(`[TestStore] Getting test: ${testId}`);
        return this.activeTests.get(testId);
    },

    getTestStatus(testId: string): Record<string, any> | undefined {
        const test = this.getTest(testId);
        if (!test) return undefined;
        return {
            status: test.status,
            progress: test.progress,
            results: test.results,
            error: test.error,
            runtime: Date.now() - test.startTime.getTime(),
        };
    },

    createTest(testId: string, testInfo: Partial<TestInfo>): TestInfo {
        console.log(`[TestStore] Creating test: ${testId}`);
        if (!testInfo.userId || !testInfo.projectId) {
            throw new Error("userId and projectId are required");
        }

        const completeTestInfo: TestInfo = {
            status: "running",
            startTime: new Date(),
            userId: testInfo.userId,
            projectId: testInfo.projectId,
            ...testInfo,
            abortController: new AbortController(),
        };

        const timeoutId = setTimeout(() => {
            this.timeoutTest(testId, "Test timed out after maximum runtime");
        }, MAX_TEST_RUNTIME);

        completeTestInfo.timeoutId = timeoutId;
        this.activeTests.set(testId, completeTestInfo);
        console.log(`[TestStore] Test created with status: ${completeTestInfo.status}`);
        return completeTestInfo;
    },

    setTest(testId: string, testInfo: Omit<TestInfo, 'startTime' | 'abortController' | 'status'> & Partial<TestInfo>): TestInfo {
        console.log(`[TestStore] Setting test: ${testId}`);
        const completeTestInfo: TestInfo = {
            status: "running",
            startTime: new Date(),
            ...testInfo,
            abortController: new AbortController(),
        };
        const timeoutId = setTimeout(() => {
            this.timeoutTest(testId, "Test timed out after maximum runtime");
        }, MAX_TEST_RUNTIME);
        completeTestInfo.timeoutId = timeoutId;
        this.activeTests.set(testId, completeTestInfo);
        console.log(`[TestStore] Test count: ${this.activeTests.size}`);
        return completeTestInfo;
    },

    updateTest(testId: string, updates: Partial<TestInfo>): boolean {
        console.log(`[TestStore] Updating test: ${testId}`);
        const currentTest = this.activeTests.get(testId);
        if (currentTest) {
            if (updates.status === "completed" || updates.status === "error" || updates.status === "aborted") {
                this.clearTestTimeout(testId);
            }
            this.activeTests.set(testId, { ...currentTest, ...updates });
            console.log(`[TestStore] Test ${testId} updated to status: ${updates.status || currentTest.status}`);
            return true;
        }
        console.log(`[TestStore] Update failed - test not found`);
        return false;
    },

    timeoutTest(testId: string, reason: string) {
        console.log(`[TestStore] Test ${testId} timed out: ${reason}`);
        const test = this.activeTests.get(testId);
        if (test) {
            if (test.timeoutId) {
                clearTimeout(test.timeoutId);
            }
            if (test.abortController) {
                try {
                    test.abortController.abort();
                } catch (e) {
                    console.error(`[TestStore] Error aborting test: ${e}`);
                }
            }
            this.activeTests.set(testId, {
                ...test,
                status: "error",
                error: reason,
                progress: "Timed out",
                timeoutId: undefined,
            });
            console.log(`[TestStore] Test ${testId} marked as timed out`);
        }
    },

    clearTestTimeout(testId: string) {
        const test = this.activeTests.get(testId);
        if (test && test.timeoutId) {
            console.log(`[TestStore] Clearing timeout for test: ${testId}`);
            clearTimeout(test.timeoutId);
            test.timeoutId = undefined;
        }
    },

    deleteTest(testId: string) {
        console.log(`[TestStore] Deleting test: ${testId}`);
        this.clearTestTimeout(testId);
        const test = this.activeTests.get(testId);
        if (test && test.abortController) {
            try {
                test.abortController.abort();
            } catch (e) { }
        }
        this.activeTests.delete(testId);
        console.log(`[TestStore] Test count: ${this.activeTests.size}`);
    },

    debug() {
        const entries = Array.from(this.activeTests.entries());
        const testDetails = entries.map(([key, test]) => ({
            id: key,
            status: test.status,
            runtime: Date.now() - test.startTime.getTime(),
            hasTimeout: !!test.timeoutId,
        }));
        return {
            count: this.activeTests.size,
            keys: Array.from(this.activeTests.keys()),
            details: testDetails,
        };
    },

    setupCleanupJob() {
        setInterval(() => {
            console.log(`[TestStore] Running scheduled cleanup`);
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            const entries = Array.from(this.activeTests.entries());
            for (const [testId, test] of entries) {
                const testAge = now - test.startTime.getTime();
                if (testAge > oneDayMs) {
                    console.log(`[TestStore] Removing stale test ${testId}`);
                    this.deleteTest(testId);
                }
            }
        }, 60 * 60 * 1000);
    }
};

TestStore.setupCleanupJob();

if (process.env.NODE_ENV === "development") {
    // @ts-ignore
    if (typeof global !== "undefined") global.__testStore = TestStore;
}

export default TestStore;