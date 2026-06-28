export const parseQueryLimit = (raw, fallback = 100, max = 1000) => {
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
};

export const parseQueryPage = (raw, fallback = 1) => {
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return parsed;
};

export const buildPaginationOptions = (query) => {
    const page = parseQueryPage(query.page, 1);
    const limit = parseQueryLimit(query.limit, 20, 100);
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

export const buildPaginatedResult = ({ docs, total, page, limit }) => {
    const totalPages = Math.ceil(total / limit) || 1;

    return {
        data: docs,
        meta: {
            total,
            page,
            limit,
            totalPages
        }
    };
};

