export function addPopulate(query, populate) {
  if (populate == null || populate === '') return;
  if (Array.isArray(populate)) {
    populate.forEach((p, i) => {
      if (p != null && p !== '') query[`populate[${i}]`] = p;
    });
  } else {
    query.populate = populate;
  }
}

export function buildListQuery(params = {}, options = {}) {
  const omit = new Set(options.omit ?? []);
  const { pagination: paginationObj, populate, filters, sort, ...rest } = params;
  const query = {};
  for (const key of Object.keys(rest)) {
    if (!omit.has(key)) query[key] = rest[key];
  }
  if (sort != null && sort !== '') query.sort = sort;
  if (paginationObj && typeof paginationObj === 'object') {
    if (query['pagination[page]'] == null && paginationObj.page != null) {
      query['pagination[page]'] = paginationObj.page;
    }
    if (query['pagination[pageSize]'] == null && paginationObj.pageSize != null) {
      query['pagination[pageSize]'] = paginationObj.pageSize;
    }
  }
  if (filters != null) query.filters = filters;
  addPopulate(query, populate);
  return query;
}

export function normalizeStrapiEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.attributes && typeof entry.attributes === 'object') {
    return { id: entry.id, documentId: entry.documentId ?? entry.id, ...entry.attributes };
  }
  return entry;
}

export function normalizeStrapiListResponse(response, normalizeEntry = normalizeStrapiEntry) {
  const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
  return {
    data: list.map((row) => normalizeEntry(row)).filter(Boolean),
    meta: response?.meta ?? {},
  };
}

export function normalizeStrapiOneResponse(response, normalizeEntry = normalizeStrapiEntry) {
  const row = response?.data ?? response ?? null;
  return { data: row ? normalizeEntry(row) : null, meta: response?.meta ?? {} };
}

