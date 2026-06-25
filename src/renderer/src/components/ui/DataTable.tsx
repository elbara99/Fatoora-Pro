import { Table } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'

interface Props<T> {
  columns: ColumnsType<T>
  data: T[]
  loading?: boolean
  rowKey?: string
  pagination?: TablePaginationConfig | false
  scroll?: { x?: number | string; y?: number | string }
}

export default function DataTable<T extends object>({
  columns, data, loading, rowKey = 'id', pagination = { pageSize: 20 }, scroll = { x: 'max-content' }
}: Props<T>) {
  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey={rowKey}
      loading={loading}
      pagination={pagination}
      scroll={scroll}
      size="middle"
      bordered
    />
  )
}
