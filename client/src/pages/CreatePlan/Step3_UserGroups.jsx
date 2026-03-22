import { useGetGroupsQuery } from '../../store/apiSlice'

export default function Step3_UserGroups({ programId }) {
  const { data: groups = [], isLoading, isError } = useGetGroupsQuery()

  // Filter groups to current program when programId is available
  const filtered = programId
    ? groups.filter((g) => g.program_id === Number(programId))
    : groups

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 font-[Inter]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-teal-700">User Groups</h2>
        <button
          type="button"
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Create Group
        </button>
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-gray-500">Loading groups…</p>}
      {isError && <p className="py-8 text-center text-sm text-red-500">Failed to load groups.</p>}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-teal-600 text-white">
                <th className="px-4 py-3 font-medium">Group ID</th>
                <th className="px-4 py-3 font-medium">Group Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Program ID</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No groups found. Click &quot;Create Group&quot; to add one.
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{g.id}</td>
                    <td className="px-4 py-3 text-gray-700">{g.group_name}</td>
                    <td className="px-4 py-3 text-gray-500">{g.group_type}</td>
                    <td className="px-4 py-3 text-gray-500">{g.program_id}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded border border-teal-500 px-3 py-1 text-xs text-teal-600 hover:bg-teal-50"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="rounded border border-red-300 px-3 py-1 text-xs text-red-500 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
