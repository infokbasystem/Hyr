export const PLANNING_TEST_LOADING_DELAY_MS = 0;

export async function withPlanningLoadingDelay(request) {
  const delay = import.meta.env?.DEV ? PLANNING_TEST_LOADING_DELAY_MS : 0;
  if (delay === 0) return request;

  let timer;
  try {
    const [result] = await Promise.all([
      request,
      new Promise(resolve => { timer = setTimeout(resolve, delay); }),
    ]);
    return result;
  } finally {
    clearTimeout(timer);
  }
}
