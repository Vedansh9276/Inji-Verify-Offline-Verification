export function exportToCSV(data: any[], filename: string) {
  if (!data.length) return
  
  const headers = ['Time', 'Hash', 'Status', 'Synced', 'Details']
  const rows = data.map(item => [
    new Date(item.timestamp).toISOString(),
    item.vcHash,
    item.status,
    item.synced ? 'Yes' : 'No',
    JSON.stringify(item.details || {})
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportToJSON(data: any[], filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
