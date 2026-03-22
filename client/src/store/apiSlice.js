import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:5000/api' }),
  tagTypes: [
    'Programs',
    'Kpis',
    'Milestones',
    'PayoutRules',
    'PayoutSlabs',
    'Performance',
    'Groups',
    'Incentives',
  ],
  endpoints: (builder) => ({
    // ── Programs ──────────────────────────────────────────────────────
    getPrograms: builder.query({ query: () => '/programs', providesTags: ['Programs'] }),
    getProgram: builder.query({ query: (id) => `/programs/${id}`, providesTags: (_r, _e, id) => [{ type: 'Programs', id }] }),
    createProgram: builder.mutation({ query: (body) => ({ url: '/programs', method: 'POST', body }), invalidatesTags: ['Programs'] }),
    updateProgram: builder.mutation({ query: ({ id, ...body }) => ({ url: `/programs/${id}`, method: 'PUT', body }), invalidatesTags: (_r, _e, { id }) => [{ type: 'Programs', id }, 'Programs'] }),
    deleteProgram: builder.mutation({ query: (id) => ({ url: `/programs/${id}`, method: 'DELETE' }), invalidatesTags: ['Programs'] }),

    // ── KPIs ──────────────────────────────────────────────────────────
    getKpis: builder.query({ query: () => '/kpis', providesTags: ['Kpis'] }),
    getKpi: builder.query({ query: (id) => `/kpis/${id}`, providesTags: (_r, _e, id) => [{ type: 'Kpis', id }] }),
    createKpi: builder.mutation({ query: (body) => ({ url: '/kpis', method: 'POST', body }), invalidatesTags: ['Kpis'] }),
    updateKpi: builder.mutation({ query: ({ id, ...body }) => ({ url: `/kpis/${id}`, method: 'PUT', body }), invalidatesTags: (_r, _e, { id }) => [{ type: 'Kpis', id }, 'Kpis'] }),
    deleteKpi: builder.mutation({ query: (id) => ({ url: `/kpis/${id}`, method: 'DELETE' }), invalidatesTags: ['Kpis'] }),

    // ── KPI Milestones ────────────────────────────────────────────────
    getMilestones: builder.query({ query: (kpiId) => `/kpis/${kpiId}/milestones`, providesTags: ['Milestones'] }),
    createMilestone: builder.mutation({ query: ({ kpiId, ...body }) => ({ url: `/kpis/${kpiId}/milestones`, method: 'POST', body }), invalidatesTags: ['Milestones'] }),
    updateMilestone: builder.mutation({ query: ({ kpiId, milestoneId, ...body }) => ({ url: `/kpis/${kpiId}/milestones/${milestoneId}`, method: 'PUT', body }), invalidatesTags: ['Milestones'] }),
    deleteMilestone: builder.mutation({ query: ({ kpiId, milestoneId }) => ({ url: `/kpis/${kpiId}/milestones/${milestoneId}`, method: 'DELETE' }), invalidatesTags: ['Milestones'] }),

    // ── Payout Rules ──────────────────────────────────────────────────
    getPayoutRules: builder.query({ query: () => '/payouts', providesTags: ['PayoutRules'] }),
    getPayoutRule: builder.query({ query: (id) => `/payouts/${id}`, providesTags: (_r, _e, id) => [{ type: 'PayoutRules', id }] }),
    createPayoutRule: builder.mutation({ query: (body) => ({ url: '/payouts', method: 'POST', body }), invalidatesTags: ['PayoutRules'] }),
    updatePayoutRule: builder.mutation({ query: ({ id, ...body }) => ({ url: `/payouts/${id}`, method: 'PUT', body }), invalidatesTags: (_r, _e, { id }) => [{ type: 'PayoutRules', id }, 'PayoutRules'] }),
    deletePayoutRule: builder.mutation({ query: (id) => ({ url: `/payouts/${id}`, method: 'DELETE' }), invalidatesTags: ['PayoutRules'] }),

    // ── Payout Slabs ──────────────────────────────────────────────────
    getSlabs: builder.query({ query: (ruleId) => `/payouts/${ruleId}/slabs`, providesTags: ['PayoutSlabs'] }),
    createSlab: builder.mutation({ query: ({ ruleId, ...body }) => ({ url: `/payouts/${ruleId}/slabs`, method: 'POST', body }), invalidatesTags: ['PayoutSlabs'] }),
    updateSlab: builder.mutation({ query: ({ ruleId, slabId, ...body }) => ({ url: `/payouts/${ruleId}/slabs/${slabId}`, method: 'PUT', body }), invalidatesTags: ['PayoutSlabs'] }),
    deleteSlab: builder.mutation({ query: ({ ruleId, slabId }) => ({ url: `/payouts/${ruleId}/slabs/${slabId}`, method: 'DELETE' }), invalidatesTags: ['PayoutSlabs'] }),

    // ── Performance ───────────────────────────────────────────────────
    getPerformance: builder.query({ query: (params) => ({ url: '/performance', params }), providesTags: ['Performance'] }),
    uploadPerformance: builder.mutation({ query: (body) => ({ url: '/performance/upload', method: 'POST', body }), invalidatesTags: ['Performance'] }),

    // ── Groups ────────────────────────────────────────────────────────
    getGroups: builder.query({ query: () => '/groups', providesTags: ['Groups'] }),
    getGroup: builder.query({ query: (id) => `/groups/${id}`, providesTags: (_r, _e, id) => [{ type: 'Groups', id }] }),
    createGroup: builder.mutation({ query: (body) => ({ url: '/groups', method: 'POST', body }), invalidatesTags: ['Groups'] }),

    // ── Calculate ─────────────────────────────────────────────────────
    calculateIncentive: builder.mutation({
      query: ({ programId, userId, period }) => ({
        url: `/calculate/${programId}/${userId}/${period}`,
        method: 'POST',
      }),
      invalidatesTags: ['Incentives'],
    }),
  }),
})

export const {
  useGetProgramsQuery,
  useGetProgramQuery,
  useCreateProgramMutation,
  useUpdateProgramMutation,
  useDeleteProgramMutation,
  useGetKpisQuery,
  useGetKpiQuery,
  useCreateKpiMutation,
  useUpdateKpiMutation,
  useDeleteKpiMutation,
  useGetMilestonesQuery,
  useCreateMilestoneMutation,
  useUpdateMilestoneMutation,
  useDeleteMilestoneMutation,
  useGetPayoutRulesQuery,
  useGetPayoutRuleQuery,
  useCreatePayoutRuleMutation,
  useUpdatePayoutRuleMutation,
  useDeletePayoutRuleMutation,
  useGetSlabsQuery,
  useCreateSlabMutation,
  useUpdateSlabMutation,
  useDeleteSlabMutation,
  useGetPerformanceQuery,
  useUploadPerformanceMutation,
  useGetGroupsQuery,
  useGetGroupQuery,
  useCreateGroupMutation,
  useCalculateIncentiveMutation,
} = apiSlice
