import { requestJson } from './apiClient'

export function searchToBeInvoiced({ mode = 'RETURNED', conditions = [], sorts, pageNumber = 1, pageSize = 100 } = {}) {
  return requestJson('/reservation/to-be-invoiced', {
    method: 'POST',
    body: {
      mode,
      filter: {
        conditions,
      },
      pagination: {
        pageNumber,
        pageSize,
      },
      sorts: sorts ?? [
        {
          field: 'id',
          direction: 'desc',
        },
      ],
    },
  })
}
