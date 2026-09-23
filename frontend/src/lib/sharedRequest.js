const inFlightRequests = new Map()

export function getSharedRequest(key, requestFactory) {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)
  }

  const requestPromise = Promise.resolve()
    .then(() => requestFactory())
    .finally(() => {
      inFlightRequests.delete(key)
    })

  inFlightRequests.set(key, requestPromise)
  return requestPromise
}
