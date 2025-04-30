// @/app/api/projects/[id]/sse-status/[testId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import TestStore from "@/app/utils/test-utils/test-store";
import clientPromise from "@/lib/mongodb";

export const dynamic = 'force-dynamic';

// Cache to prevent repeated API calls
const resultsCache = new Map<string, any>();
// Map to track pending test IDs
const pendingTests = new Map<string, { timestamp: number, retries: number }>();

/**
 * Fetch results from FastAPI with caching
 */
async function fetchAndCacheResults(fastApiUrl: string, testId: string): Promise<any | null> {
  // Check cache first
  if (resultsCache.has(testId)) {
    console.log(`[SSE] Using cached results for test ${testId}`);
    return resultsCache.get(testId);
  }

  try {
    console.log(`[SSE] Fetching results for test ${testId}`);
    const resultsResponse = await fetch(`${fastApiUrl}/task-results/${testId}`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '',
      }
    });

    if (resultsResponse.ok) {
      const results = await resultsResponse.json();
      // Cache the results
      resultsCache.set(testId, results);
      return results;
    }
  } catch (error) {
    console.error(`[SSE] Error fetching results for test ${testId}:`, error);
  }

  return null;
}

/**
 * GET handler for SSE endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; testId: string } }
) {
  // Authenticate user
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, testId } = await params;
  const encoder = new TextEncoder();

  // Track active connections for monitoring
  const connectionId = Math.random().toString(36).substring(2, 9);
  console.log(`[SSE-${connectionId}] New connection for test ${testId}`);

  // Check if this is a known test in MongoDB - even if not in TestStore yet
  let isValidTest = false;
  try {
    const client = await clientPromise;
    const db = client.db("promptops");
    const result = await db.collection("result").findOne({ testId });
    if (result) {
      isValidTest = true;
      console.log(`[SSE-${connectionId}] Found test ${testId} in database`);
    }
  } catch (error) {
    console.error(`[SSE-${connectionId}] Error checking test in database:`, error);
  }

  const stream = new ReadableStream({
    start: async (controller) => {
      let isClosed = false;
      let hasFetchedResults = false;
      let lastStatus = '';
      let initialRetryCount = 0;

      const safeEnqueue = (msg: string) => {
        if (!isClosed) {
          try {
            controller.enqueue(encoder.encode(msg));
          } catch (err) {
            console.error(`[SSE-${connectionId}] Error enqueuing message`, err);
          }
        }
      };

      try {
        // Authentication check
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          safeEnqueue(`event: error\ndata: ${JSON.stringify({ error: 'Unauthorized' })}\n\n`);
          controller.close();
          isClosed = true;
          return;
        }

        const userId = session.user.id;
        console.log(`[SSE-${connectionId}] User ${userId} connected for test ${testId}`);

        // Check initial state from TestStore with retry mechanism for pending tests
        const checkTestStatus = async () => {
          // Check TestStore first
          let testStatus = TestStore.getTestStatus(testId);

          // If no status in TestStore but test is valid in DB, treat as pending
          if (!testStatus && (isValidTest || pendingTests.has(testId))) {
            // Track this as a pending test if not already tracked
            if (!pendingTests.has(testId)) {
              pendingTests.set(testId, { timestamp: Date.now(), retries: 0 });
            }

            // Update retry count
            const pendingInfo = pendingTests.get(testId)!;
            pendingInfo.retries++;
            pendingTests.set(testId, pendingInfo);

            // Send a pending status so frontend knows test exists but is initializing
            const pendingData = JSON.stringify({
              status: "pending",
              progress: "Test initialization in progress...",
              retries: pendingInfo.retries
            });
            safeEnqueue(`event: status\ndata: ${pendingData}\n\n`);

            // If pending too long (over 2 minutes), check FastAPI directly
            const pendingTime = Date.now() - pendingInfo.timestamp;
            if (pendingTime > 120000) {
              console.log(`[SSE-${connectionId}] Test ${testId} pending too long, checking FastAPI directly`);

              try {
                const fastApiUrl = (process.env.FASTAPI_URL || 'http://localhost:8000').replace(/\/$/, '');
                const response = await fetch(`${fastApiUrl}/task-status/${testId}`, {
                  headers: {
                    'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '',
                  }
                });

                if (response.ok) {
                  // Found in FastAPI! Update TestStore and continue
                  const fastApiStatus = await response.json();
                  TestStore.createTest(testId, {
                    status: fastApiStatus.status || "running",
                    progress: fastApiStatus.progress || "Processing test",
                    userId: userId,
                    projectId: projectId
                  });
                  pendingTests.delete(testId);
                  return true;
                }
              } catch (error) {
                console.error(`[SSE-${connectionId}] Error checking FastAPI for pending test:`, error);
              }

              // If still not found after too many retries, give up
              if (pendingInfo.retries > 20) {
                pendingTests.delete(testId);
                const notFoundData = JSON.stringify({
                  status: "not_found",
                  error: "Test initialization timeout"
                });
                safeEnqueue(`event: status\ndata: ${notFoundData}\n\n`);
                safeEnqueue(`event: close\ndata: {}\n\n`);
                controller.close();
                isClosed = true;
                return false;
              }
            }

            // Return true to continue polling
            return true;
          }

          // If test still not found and we're not treating it as pending
          if (!testStatus && !pendingTests.has(testId)) {
            // First few retries - might just be initializing
            if (initialRetryCount < 3) {
              initialRetryCount++;
              console.log(`[SSE-${connectionId}] Test ${testId} not found, retry ${initialRetryCount}/3`);

              // Mark as pending
              pendingTests.set(testId, { timestamp: Date.now(), retries: initialRetryCount });
              const pendingData = JSON.stringify({
                status: "pending",
                progress: "Waiting for test to initialize..."
              });
              safeEnqueue(`event: status\ndata: ${pendingData}\n\n`);
              return true;
            }

            // After retries, declare not found
            console.log(`[SSE-${connectionId}] Test ${testId} not found in TestStore after retries`);
            const notFoundData = JSON.stringify({
              status: "not_found",
              error: "Test not found or has expired"
            });
            safeEnqueue(`event: status\ndata: ${notFoundData}\n\n`);
            safeEnqueue(`event: close\ndata: {}\n\n`);
            controller.close();
            isClosed = true;
            return false;
          }

          return !!testStatus;
        };

        // Initial check - continue only if test status exists or we're treating it as pending
        if (!await checkTestStatus()) {
          return;
        }

        // If test is already completed, get results from cache first
        const initialStatus = TestStore.getTestStatus(testId);
        if (initialStatus && initialStatus.status === "completed" && !initialStatus.results) {
          const fastApiUrl = (process.env.FASTAPI_URL || 'http://localhost:8000').replace(/\/$/, '');
          const cachedResults = await fetchAndCacheResults(fastApiUrl, testId);

          if (cachedResults) {
            TestStore.updateTest(testId, { results: cachedResults });
          }
        }

        // Function to check FastAPI status and update TestStore
        const checkFastApiStatus = async () => {
          if (isClosed) return;

          try {
            const fastApiUrl = (process.env.FASTAPI_URL || 'http://localhost:5328').replace(/\/$/, '');
            const response = await fetch(`${fastApiUrl}/task-status/${testId}`, {
              headers: {
                'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '',
              }
            });

            if (response.ok) {
              // If we get here and test was pending, create it in TestStore
              if (pendingTests.has(testId)) {
                pendingTests.delete(testId);
              }

              const fastApiStatus = await response.json();
              let status = fastApiStatus.status;

              // Normalize status values
              if (status === "running" || status === "processing") {
                status = "running";
              }

              // Skip update if status hasn't changed
              if (status === lastStatus && status !== "completed") {
                return;
              }

              lastStatus = status;

              // Create or update test in TestStore
              if (!TestStore.getTestStatus(testId)) {
                TestStore.createTest(testId, {
                  status: status,
                  progress: fastApiStatus.progress || "Processing test",
                  error: fastApiStatus.error,
                  userId: userId,
                  projectId: projectId
                });
              } else {
                TestStore.updateTest(testId, {
                  status: status,
                  progress: fastApiStatus.progress || "Processing test",
                  error: fastApiStatus.error
                });
              }

              // If completed, and results haven't been fetched, call /task-results
              if (status === "completed" && !hasFetchedResults) {
                hasFetchedResults = true;

                const results = await fetchAndCacheResults(fastApiUrl, testId);

                if (results) {
                  TestStore.updateTest(testId, { results });

                  // Save results to database
                  const client = await clientPromise;
                  const db = client.db("promptops");
                  await db.collection("result").updateOne(
                    { testId, projectId },
                    {
                      $set: {
                        results: results,
                        updatedAt: new Date(),
                        completedAt: new Date()
                      }
                    },
                    { upsert: true } // Create if doesn't exist
                  );
                  console.log(`[SSE-${connectionId}] Results for test ${testId} saved to database`);
                }
              }
            } else if (response.status === 404) {
              // If test was marked as pending but FastAPI doesn't know about it,
              // incrementally increase backoff until we give up
              if (pendingTests.has(testId)) {
                const pendingInfo = pendingTests.get(testId)!;
                pendingInfo.retries++;

                if (pendingInfo.retries > 20) {
                  console.log(`[SSE-${connectionId}] Pending test ${testId} not found in FastAPI after ${pendingInfo.retries} attempts`);
                  pendingTests.delete(testId);

                  const notFoundData = JSON.stringify({
                    status: "not_found",
                    error: "Test initialization failed"
                  });
                  safeEnqueue(`event: status\ndata: ${notFoundData}\n\n`);
                  return;
                }

                pendingTests.set(testId, pendingInfo);
              } else {
                console.log(`[SSE-${connectionId}] Test ${testId} not found in FastAPI`);
              }
            } else {
              console.error(`[SSE-${connectionId}] Error from FastAPI:`, response.statusText);
            }
          } catch (error) {
            console.error(`[SSE-${connectionId}] Error checking status:`, error);
          }
        };

        // Function to send the current status via SSE.
        let intervalId: ReturnType<typeof setTimeout>;
        const sendStatus = (): boolean => {
          if (isClosed) return false;

          // If test is pending, send pending status
          if (pendingTests.has(testId)) {
            const pendingInfo = pendingTests.get(testId)!;
            const pendingData = JSON.stringify({
              status: "pending",
              progress: "Test initialization in progress...",
              retries: pendingInfo.retries
            });
            safeEnqueue(`event: status\ndata: ${pendingData}\n\n`);
            return true;
          }

          const currentStatus = TestStore.getTestStatus(testId);
          if (!currentStatus) {
            // This shouldn't happen unless test was removed while connection active
            console.log(`[SSE-${connectionId}] Test ${testId} no longer available`);
            const notFoundData = JSON.stringify({
              status: "not_found",
              error: "Test no longer available"
            });
            safeEnqueue(`event: status\ndata: ${notFoundData}\n\n`);
            safeEnqueue(`event: close\ndata: {}\n\n`);
            return false;
          }

          const statusData = JSON.stringify(currentStatus);
          safeEnqueue(`event: status\ndata: ${statusData}\n\n`);

          // Check for terminal states
          if (
            currentStatus.status === "completed" ||
            currentStatus.status === "error" ||
            currentStatus.status === "aborted"
          ) {
            console.log(`[SSE-${connectionId}] Test ${testId} completed, closing connection`);
            safeEnqueue(`event: close\ndata: {}\n\n`);
            clearInterval(intervalId);
            controller.close();
            isClosed = true;
            return false;
          }

          return true;
        };

        // Check and update status function for interval
        const checkAndUpdateStatus = function () {
          if (isClosed) {
            clearInterval(intervalId);
            return;
          }

          // Send heartbeat
          safeEnqueue(`event: heartbeat\ndata: ${Date.now()}\n\n`);

          // Check status
          checkFastApiStatus().then(() => {
            if (!isClosed) {
              shouldContinue = sendStatus();

              // Switch to slower polling if not active
              if (shouldContinue) {
                const currentStatus = TestStore.getTestStatus(testId);
                if (currentStatus && currentStatus.status !== "running" && !pendingTests.has(testId)) {
                  if (currentInterval !== IDLE_POLLING_INTERVAL) {
                    clearInterval(intervalId);
                    currentInterval = IDLE_POLLING_INTERVAL;

                    // Only restart if we should continue
                    if (shouldContinue) {
                      intervalId = setInterval(checkAndUpdateStatus, currentInterval);
                    }
                  }
                }

                if (!shouldContinue) {
                  clearInterval(intervalId);
                }
              } else {
                clearInterval(intervalId);
              }
            }
          }).catch(error => {
            console.error(`[SSE-${connectionId}] Error checking status:`, error);
          });
        };

        // Initial check and status send
        await checkFastApiStatus();
        let shouldContinue = sendStatus();

        // Use different polling intervals for active vs completed tests
        const ACTIVE_POLLING_INTERVAL = 3000;   // 3 seconds for active tests
        const IDLE_POLLING_INTERVAL = 60000;    // 1 minute for heartbeats

        // Initial polling is faster to get quick updates
        let currentInterval = ACTIVE_POLLING_INTERVAL;

        // Start the polling interval
        intervalId = setInterval(checkAndUpdateStatus, currentInterval);

        // Listen for abort events
        request.signal.addEventListener("abort", () => {
          console.log(`[SSE-${connectionId}] Connection aborted for test ${testId}`);
          clearInterval(intervalId);
          isClosed = true;
        });
      } catch (error) {
        console.error(`[SSE-${connectionId}] Stream error:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        safeEnqueue(`event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`);
        safeEnqueue(`event: close\ndata: {}\n\n`);
        controller.close();
        isClosed = true;
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    }
  });
}